import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import type {
  Empty,
  UserRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UserResponse,
  UserListResponse,
} from '../src/types/grpc.js';

// ── gRPC client setup ─────────────────────────────────────────────────────────

const PROTO_PATH = path.resolve('./src/proto/user.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const userProto = (grpc.loadPackageDefinition(packageDef) as any).user;

interface GrpcServiceError { code: grpc.status; details: string; }

interface UserServiceClient {
  CreateUser(req: CreateUserRequest, cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  GetUser(req: UserRequest,          cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  UpdateUser(req: UpdateUserRequest, cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  ListUsers(req: Empty,              cb: (e: GrpcServiceError | null, r: UserListResponse) => void): void;
  DeleteUser(req: UserRequest,       cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
}

const raw: UserServiceClient = new userProto.UserService(
  'localhost:50051',
  grpc.credentials.createInsecure(),
);

const client = {
  createUser: (req: CreateUserRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.CreateUser(req, (e, r) => (e ? rej(e) : res(r)))),
  getUser: (req: UserRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.GetUser(req, (e, r) => (e ? rej(e) : res(r)))),
  updateUser: (req: UpdateUserRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.UpdateUser(req, (e, r) => (e ? rej(e) : res(r)))),
  listUsers: (): Promise<UserListResponse> =>
    new Promise((res, rej) => raw.ListUsers({}, (e, r) => (e ? rej(e) : res(r)))),
  deleteUser: (req: UserRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.DeleteUser(req, (e, r) => (e ? rej(e) : res(r)))),
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Unique suffix per run so tests never collide with leftover data
const RUN = Date.now();
const uid = (name: string) => `${name}_${RUN}`;

const assertGrpcError = (err: unknown, code: grpc.status, fragment?: string) => {
  const e = err as GrpcServiceError;
  assert.equal(e.code, code, `expected gRPC status ${code}, got ${e.code}: ${e.details}`);
  if (fragment) {
    assert.ok(
      e.details.toLowerCase().includes(fragment.toLowerCase()),
      `expected details to include "${fragment}", got: "${e.details}"`,
    );
  }
};

const createTempUser = (name: string) =>
  client.createUser({
    username: uid(name),
    firstname: 'Test',
    lastname: 'User',
    email: `${uid(name)}@example.com`,
  });

const UNKNOWN_ID = '00000000-0000-0000-0000-000000000000';

// ── CreateUser ────────────────────────────────────────────────────────────────

describe('CreateUser', () => {
  test('creates a user with correct fields and default role', async () => {
    const user = await createTempUser('create');
    try {
      assert.ok(user.id, 'should have an id');
      assert.equal(user.username, uid('create'));
      assert.equal(user.firstname, 'Test');
      assert.equal(user.lastname, 'User');
      assert.equal(user.email, `${uid('create')}@example.com`);
      assert.deepEqual(user.roles, ['user']);
      assert.ok(user.profile, 'should have a profile');
      assert.equal(user.profile?.language, 'en');
      assert.equal(user.profile?.dark_theme, false);
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });

  test('rejects empty username', async () => {
    await assert.rejects(
      () => client.createUser({ username: '', firstname: 'A', lastname: 'B', email: 'a@b.com' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'username'); return true; },
    );
  });

  test('rejects username with invalid characters', async () => {
    await assert.rejects(
      () => client.createUser({ username: 'bad user!', firstname: 'A', lastname: 'B', email: 'a@b.com' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'username'); return true; },
    );
  });

  test('rejects username longer than 30 characters', async () => {
    await assert.rejects(
      () => client.createUser({ username: 'a'.repeat(31), firstname: 'A', lastname: 'B', email: 'a@b.com' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'username'); return true; },
    );
  });

  test('rejects invalid email format', async () => {
    await assert.rejects(
      () => client.createUser({ username: uid('bad_email'), firstname: 'A', lastname: 'B', email: 'not-an-email' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'email'); return true; },
    );
  });

  test('rejects empty firstname', async () => {
    await assert.rejects(
      () => client.createUser({ username: uid('no_first'), firstname: '', lastname: 'B', email: 'x@x.com' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'firstname'); return true; },
    );
  });

  test('rejects duplicate username', async () => {
    const user = await createTempUser('dup_un');
    try {
      await assert.rejects(
        () => client.createUser({ username: uid('dup_un'), firstname: 'X', lastname: 'Y', email: 'other@dup.com' }),
        (err) => { assertGrpcError(err, grpc.status.ALREADY_EXISTS, 'username'); return true; },
      );
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });

  test('rejects duplicate email', async () => {
    const user = await createTempUser('dup_em');
    try {
      await assert.rejects(
        () => client.createUser({ username: uid('other'), firstname: 'X', lastname: 'Y', email: `${uid('dup_em')}@example.com` }),
        (err) => { assertGrpcError(err, grpc.status.ALREADY_EXISTS, 'email'); return true; },
      );
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });
});

// ── GetUser ───────────────────────────────────────────────────────────────────

describe('GetUser', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('get')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('returns the correct user by id', async () => {
    const user = await client.getUser({ id: userId });
    assert.equal(user.id, userId);
    assert.equal(user.username, uid('get'));
    assert.ok(Array.isArray(user.roles));
    assert.ok(Array.isArray(user.permissions));
  });

  test('rejects empty id', async () => {
    await assert.rejects(
      () => client.getUser({ id: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('returns NOT_FOUND for unknown id', async () => {
    await assert.rejects(
      () => client.getUser({ id: UNKNOWN_ID }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});

// ── UpdateUser ────────────────────────────────────────────────────────────────

describe('UpdateUser', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('update')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('updates firstname and lastname', async () => {
    const updated = await client.updateUser({ id: userId, firstname: 'New', lastname: 'Name' });
    assert.equal(updated.firstname, 'New');
    assert.equal(updated.lastname, 'Name');
  });

  test('updates profile picture, dark_theme, and language', async () => {
    const updated = await client.updateUser({
      id: userId,
      profile_picture: 'https://example.com/pic.png',
      dark_theme: true,
      language: 'fr',
    });
    assert.equal(updated.profile?.profile_picture, 'https://example.com/pic.png');
    assert.equal(updated.profile?.dark_theme, true);
    assert.equal(updated.profile?.language, 'fr');
  });

  test('partial update leaves other fields unchanged', async () => {
    const before = await client.getUser({ id: userId });
    const updated = await client.updateUser({ id: userId, firstname: 'Partial' });
    assert.equal(updated.firstname, 'Partial');
    assert.equal(updated.lastname, before.lastname);
  });

  test('rejects empty id', async () => {
    await assert.rejects(
      () => client.updateUser({ id: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('rejects invalid language code', async () => {
    await assert.rejects(
      () => client.updateUser({ id: userId, language: 'english' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'language'); return true; },
    );
  });

  test('rejects firstname longer than 50 characters', async () => {
    await assert.rejects(
      () => client.updateUser({ id: userId, firstname: 'a'.repeat(51) }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'firstname'); return true; },
    );
  });

  test('returns NOT_FOUND for unknown id', async () => {
    await assert.rejects(
      () => client.updateUser({ id: UNKNOWN_ID, firstname: 'X' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});

// ── ListUsers ─────────────────────────────────────────────────────────────────

describe('ListUsers', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('list')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('returns an array that includes the created user', async () => {
    const { users } = await client.listUsers();
    assert.ok(Array.isArray(users));
    const found = users.find((u) => u.id === userId);
    assert.ok(found, 'created user should appear in the list');
    assert.ok(Array.isArray(found?.roles));
    assert.ok(Array.isArray(found?.permissions));
  });
});

// ── DeleteUser ────────────────────────────────────────────────────────────────

describe('DeleteUser', () => {
  test('deletes a user and makes them unreachable', async () => {
    const user = await createTempUser('delete');
    const deleted = await client.deleteUser({ id: user.id });
    assert.equal(deleted.id, user.id);
    assert.equal(deleted.username, user.username);

    await assert.rejects(
      () => client.getUser({ id: user.id }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('rejects empty id', async () => {
    await assert.rejects(
      () => client.deleteUser({ id: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('returns NOT_FOUND for unknown id', async () => {
    await assert.rejects(
      () => client.deleteUser({ id: UNKNOWN_ID }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});
