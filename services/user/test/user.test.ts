import { describe, test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import type {
  Empty,
  UserRequest,
  ThemeRequest,
  CreateUserRequest,
  UpdateUserRequest,
  UsernameRequest,
  EmailRequest,
  RoleRequest,
  CreateThemeRequest,
  UpdateThemeRequest,
  DeleteThemeRequest,
  SetActiveThemeRequest,
  UserResponse,
  UserListResponse,
  ProfileResponse,
  ThemeResponse,
  ThemeListResponse,
} from '../src/types/grpc.js';

// ── gRPC client setup ─────────────────────────────────────────────────────────

const PROTO_PATH = path.resolve('./src/proto/user.proto');
const packageDef = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const userProto = (grpc.loadPackageDefinition(packageDef) as any).user;

interface GrpcServiceError { code: grpc.status; details: string; }

interface UserServiceClient {
  CreateUser(req: CreateUserRequest,    cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  GetUser(req: UserRequest,             cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  GetUserByUsername(req: UsernameRequest, cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  GetUserByEmail(req: EmailRequest,     cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  UpdateUser(req: UpdateUserRequest,    cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  ListUsers(req: Empty,                 cb: (e: GrpcServiceError | null, r: UserListResponse) => void): void;
  DeleteUser(req: UserRequest,          cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  AssignRole(req: RoleRequest,          cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  RemoveRole(req: RoleRequest,          cb: (e: GrpcServiceError | null, r: UserResponse) => void): void;
  GetProfile(req: UserRequest,              cb: (e: GrpcServiceError | null, r: ProfileResponse) => void): void;
  CreateTheme(req: CreateThemeRequest,      cb: (e: GrpcServiceError | null, r: ThemeResponse) => void): void;
  GetTheme(req: ThemeRequest,               cb: (e: GrpcServiceError | null, r: ThemeResponse) => void): void;
  ListThemes(req: UserRequest,              cb: (e: GrpcServiceError | null, r: ThemeListResponse) => void): void;
  UpdateTheme(req: UpdateThemeRequest,      cb: (e: GrpcServiceError | null, r: ThemeResponse) => void): void;
  DeleteTheme(req: DeleteThemeRequest,      cb: (e: GrpcServiceError | null, r: ThemeResponse) => void): void;
  SetActiveTheme(req: SetActiveThemeRequest, cb: (e: GrpcServiceError | null, r: ThemeResponse) => void): void;
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
  getUserByUsername: (req: UsernameRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.GetUserByUsername(req, (e, r) => (e ? rej(e) : res(r)))),
  getUserByEmail: (req: EmailRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.GetUserByEmail(req, (e, r) => (e ? rej(e) : res(r)))),
  updateUser: (req: UpdateUserRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.UpdateUser(req, (e, r) => (e ? rej(e) : res(r)))),
  listUsers: (): Promise<UserListResponse> =>
    new Promise((res, rej) => raw.ListUsers({}, (e, r) => (e ? rej(e) : res(r)))),
  deleteUser: (req: UserRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.DeleteUser(req, (e, r) => (e ? rej(e) : res(r)))),
  assignRole: (req: RoleRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.AssignRole(req, (e, r) => (e ? rej(e) : res(r)))),
  removeRole: (req: RoleRequest): Promise<UserResponse> =>
    new Promise((res, rej) => raw.RemoveRole(req, (e, r) => (e ? rej(e) : res(r)))),
  getProfile: (req: UserRequest): Promise<ProfileResponse> =>
    new Promise((res, rej) => raw.GetProfile(req, (e, r) => (e ? rej(e) : res(r)))),
  createTheme: (req: CreateThemeRequest): Promise<ThemeResponse> =>
    new Promise((res, rej) => raw.CreateTheme(req, (e, r) => (e ? rej(e) : res(r)))),
  getTheme: (req: ThemeRequest): Promise<ThemeResponse> =>
    new Promise((res, rej) => raw.GetTheme(req, (e, r) => (e ? rej(e) : res(r)))),
  listThemes: (req: UserRequest): Promise<ThemeListResponse> =>
    new Promise((res, rej) => raw.ListThemes(req, (e, r) => (e ? rej(e) : res(r)))),
  updateTheme: (req: UpdateThemeRequest): Promise<ThemeResponse> =>
    new Promise((res, rej) => raw.UpdateTheme(req, (e, r) => (e ? rej(e) : res(r)))),
  deleteTheme: (req: DeleteThemeRequest): Promise<ThemeResponse> =>
    new Promise((res, rej) => raw.DeleteTheme(req, (e, r) => (e ? rej(e) : res(r)))),
  setActiveTheme: (req: SetActiveThemeRequest): Promise<ThemeResponse> =>
    new Promise((res, rej) => raw.SetActiveTheme(req, (e, r) => (e ? rej(e) : res(r)))),
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

const BASE_THEME_COLORS = {
  color_bg:          '#7766BD',
  color_main:        '#F4EFFA',
  color_caret:       '#F4EFFA',
  color_text:        '#F4EFFA',
  color_sub:         '#4B3A91',
  color_sub_alt:     '#4B3A91',
  color_error:       '#00F5FF',
  color_extra_error: '#20C2CC',
};

const createTempTheme = (userId: string, name = 'My Theme') =>
  client.createTheme({ user_id: userId, name, ...BASE_THEME_COLORS });

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

  test('updates profile picture and language', async () => {
    const updated = await client.updateUser({
      id: userId,
      profile_picture: 'https://example.com/pic.png',
      language: 'fr',
    });
    assert.equal(updated.profile?.profile_picture, 'https://example.com/pic.png');
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

// ── GetUserByUsername ─────────────────────────────────────────────────────────

describe('GetUserByUsername', () => {
  let user: UserResponse;

  before(async () => { user = await createTempUser('by_uname'); });
  after(async ()  => { await client.deleteUser({ id: user.id }); });

  test('returns the correct user by username', async () => {
    const found = await client.getUserByUsername({ username: user.username });
    assert.equal(found.id, user.id);
    assert.equal(found.username, user.username);
    assert.ok(Array.isArray(found.roles));
  });

  test('rejects empty username', async () => {
    await assert.rejects(
      () => client.getUserByUsername({ username: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'username'); return true; },
    );
  });

  test('returns NOT_FOUND for unknown username', async () => {
    await assert.rejects(
      () => client.getUserByUsername({ username: 'does_not_exist_xyz' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});

// ── GetUserByEmail ────────────────────────────────────────────────────────────

describe('GetUserByEmail', () => {
  let user: UserResponse;

  before(async () => { user = await createTempUser('by_email'); });
  after(async ()  => { await client.deleteUser({ id: user.id }); });

  test('returns the correct user by email', async () => {
    const found = await client.getUserByEmail({ email: user.email });
    assert.equal(found.id, user.id);
    assert.equal(found.email, user.email);
    assert.ok(Array.isArray(found.roles));
  });

  test('rejects empty email', async () => {
    await assert.rejects(
      () => client.getUserByEmail({ email: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'email'); return true; },
    );
  });

  test('returns NOT_FOUND for unknown email', async () => {
    await assert.rejects(
      () => client.getUserByEmail({ email: 'nobody@nowhere.invalid' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});

// ── AssignRole / RemoveRole ───────────────────────────────────────────────────

describe('AssignRole', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('assign_role')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('assigns an existing role to a user', async () => {
    const updated = await client.assignRole({ user_id: userId, role_id: 'admin' });
    assert.ok(updated.roles.includes('admin'));
  });

  test('returns ALREADY_EXISTS if role already assigned', async () => {
    await assert.rejects(
      () => client.assignRole({ user_id: userId, role_id: 'admin' }),
      (err) => { assertGrpcError(err, grpc.status.ALREADY_EXISTS); return true; },
    );
  });

  test('returns NOT_FOUND for unknown role', async () => {
    await assert.rejects(
      () => client.assignRole({ user_id: userId, role_id: 'nonexistent_role' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('returns NOT_FOUND for unknown user', async () => {
    await assert.rejects(
      () => client.assignRole({ user_id: UNKNOWN_ID, role_id: 'user' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('rejects empty user_id', async () => {
    await assert.rejects(
      () => client.assignRole({ user_id: '', role_id: 'user' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('rejects empty role_id', async () => {
    await assert.rejects(
      () => client.assignRole({ user_id: userId, role_id: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'role_id'); return true; },
    );
  });
});

describe('RemoveRole', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('remove_role')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('removes an assigned role from a user', async () => {
    const updated = await client.removeRole({ user_id: userId, role_id: 'user' });
    assert.ok(!updated.roles.includes('user'));
  });

  test('returns NOT_FOUND if role was not assigned', async () => {
    await assert.rejects(
      () => client.removeRole({ user_id: userId, role_id: 'user' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('returns NOT_FOUND for unknown user', async () => {
    await assert.rejects(
      () => client.removeRole({ user_id: UNKNOWN_ID, role_id: 'user' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('rejects empty user_id', async () => {
    await assert.rejects(
      () => client.removeRole({ user_id: '', role_id: 'user' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('rejects empty role_id', async () => {
    await assert.rejects(
      () => client.removeRole({ user_id: userId, role_id: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'role_id'); return true; },
    );
  });
});

// ── Moderator role ────────────────────────────────────────────────────────────

describe('Moderator role', () => {
  test('can be assigned and is reflected in roles', async () => {
    const user = await createTempUser('mod_assign');
    try {
      const updated = await client.assignRole({ user_id: user.id, role_id: 'moderator' });
      assert.ok(updated.roles.includes('moderator'), 'should include moderator');
      assert.ok(updated.roles.includes('user'), 'should retain default user role');
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });

  test('grants article:write in addition to base user permissions', async () => {
    const user = await createTempUser('mod_perms');
    try {
      await client.assignRole({ user_id: user.id, role_id: 'moderator' });
      const fetched = await client.getUser({ id: user.id });
      assert.ok(fetched.permissions.includes('article:read'));
      assert.ok(fetched.permissions.includes('article:write'));
      assert.ok(fetched.permissions.includes('profile:edit'));
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });

  test('does not grant user:manage', async () => {
    const user = await createTempUser('mod_no_manage');
    try {
      await client.assignRole({ user_id: user.id, role_id: 'moderator' });
      const fetched = await client.getUser({ id: user.id });
      assert.ok(!fetched.permissions.includes('user:manage'));
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });

  test('returns ALREADY_EXISTS when assigned twice', async () => {
    const user = await createTempUser('mod_dup');
    try {
      await client.assignRole({ user_id: user.id, role_id: 'moderator' });
      await assert.rejects(
        () => client.assignRole({ user_id: user.id, role_id: 'moderator' }),
        (err) => { assertGrpcError(err, grpc.status.ALREADY_EXISTS); return true; },
      );
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });

  test('can be removed; user role is retained', async () => {
    const user = await createTempUser('mod_remove');
    try {
      await client.assignRole({ user_id: user.id, role_id: 'moderator' });
      const updated = await client.removeRole({ user_id: user.id, role_id: 'moderator' });
      assert.ok(!updated.roles.includes('moderator'), 'moderator should be gone');
      assert.ok(updated.roles.includes('user'), 'user role should remain');
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });

  test('after removal, article:write permission is revoked', async () => {
    const user = await createTempUser('mod_revert');
    try {
      await client.assignRole({ user_id: user.id, role_id: 'moderator' });
      await client.removeRole({ user_id: user.id, role_id: 'moderator' });
      const fetched = await client.getUser({ id: user.id });
      assert.ok(!fetched.permissions.includes('article:write'), 'article:write should be revoked');
      assert.ok(fetched.permissions.includes('article:read'), 'base permissions should remain');
      assert.ok(fetched.permissions.includes('profile:edit'), 'base permissions should remain');
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });

  test('returns NOT_FOUND when assigning to unknown user', async () => {
    await assert.rejects(
      () => client.assignRole({ user_id: UNKNOWN_ID, role_id: 'moderator' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('returns NOT_FOUND when removing moderator not yet assigned', async () => {
    const user = await createTempUser('mod_no_role');
    try {
      await assert.rejects(
        () => client.removeRole({ user_id: user.id, role_id: 'moderator' }),
        (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
      );
    } finally {
      await client.deleteUser({ id: user.id });
    }
  });
});

// ── GetProfile ────────────────────────────────────────────────────────────────

describe('GetProfile', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('profile')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('returns the profile for a user', async () => {
    const profile = await client.getProfile({ id: userId });
    assert.ok(profile.id, 'profile should have an id');
    assert.equal(profile.language, 'en');
  });

  test('rejects empty id', async () => {
    await assert.rejects(
      () => client.getProfile({ id: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('returns NOT_FOUND for user with no profile', async () => {
    await assert.rejects(
      () => client.getProfile({ id: UNKNOWN_ID }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('reflects profile updates', async () => {
    await client.updateUser({ id: userId, language: 'pt' });
    const profile = await client.getProfile({ id: userId });
    assert.equal(profile.language, 'pt');
  });
});

// ── CreateTheme ───────────────────────────────────────────────────────────────

describe('CreateTheme', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('theme_create')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('creates a theme with all fields', async () => {
    const theme = await createTempTheme(userId, 'Test Theme');
    assert.ok(theme.id, 'should have an id');
    assert.equal(theme.user_id, userId);
    assert.equal(theme.name, 'Test Theme');
    assert.equal(theme.color_bg, '#7766BD');
    assert.equal(theme.color_main, '#F4EFFA');
    assert.equal(theme.color_caret, '#F4EFFA');
    assert.equal(theme.color_text, '#F4EFFA');
    assert.equal(theme.color_sub, '#4B3A91');
    assert.equal(theme.color_sub_alt, '#4B3A91');
    assert.equal(theme.color_error, '#00F5FF');
    assert.equal(theme.color_extra_error, '#20C2CC');
  });

  test('accepts 3-digit hex colors', async () => {
    const theme = await client.createTheme({
      user_id: userId,
      name: 'Short Hex',
      ...BASE_THEME_COLORS,
      color_bg: '#ABC',
    });
    assert.equal(theme.color_bg, '#ABC');
  });

  test('rejects empty user_id', async () => {
    await assert.rejects(
      () => client.createTheme({ user_id: '', name: 'X', ...BASE_THEME_COLORS }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('rejects empty name', async () => {
    await assert.rejects(
      () => client.createTheme({ user_id: userId, name: '', ...BASE_THEME_COLORS }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'name'); return true; },
    );
  });

  test('rejects name longer than 100 characters', async () => {
    await assert.rejects(
      () => client.createTheme({ user_id: userId, name: 'a'.repeat(101), ...BASE_THEME_COLORS }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'name'); return true; },
    );
  });

  test('rejects invalid hex color', async () => {
    await assert.rejects(
      () => client.createTheme({ user_id: userId, name: 'Bad Color', ...BASE_THEME_COLORS, color_bg: 'red' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'color_bg'); return true; },
    );
  });

  test('rejects unknown user', async () => {
    await assert.rejects(
      () => client.createTheme({ user_id: UNKNOWN_ID, name: 'Ghost', ...BASE_THEME_COLORS }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});

// ── GetTheme ──────────────────────────────────────────────────────────────────

describe('GetTheme', () => {
  let userId: string;
  let themeId: string;

  before(async () => {
    userId = (await createTempUser('theme_get')).id;
    themeId = (await createTempTheme(userId)).id;
  });
  after(async () => { await client.deleteUser({ id: userId }); });

  test('returns the correct theme by id', async () => {
    const theme = await client.getTheme({ id: themeId });
    assert.equal(theme.id, themeId);
    assert.equal(theme.user_id, userId);
    assert.equal(theme.color_bg, '#7766BD');
  });

  test('rejects empty id', async () => {
    await assert.rejects(
      () => client.getTheme({ id: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('returns NOT_FOUND for unknown theme id', async () => {
    await assert.rejects(
      () => client.getTheme({ id: UNKNOWN_ID }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});

// ── ListThemes ────────────────────────────────────────────────────────────────

describe('ListThemes', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('theme_list')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('returns empty list when user has no themes', async () => {
    const { themes } = await client.listThemes({ id: userId });
    assert.ok(Array.isArray(themes));
    assert.equal(themes.length, 0);
  });

  test('returns all themes belonging to the user', async () => {
    await createTempTheme(userId, 'Theme A');
    await createTempTheme(userId, 'Theme B');
    const { themes } = await client.listThemes({ id: userId });
    assert.ok(themes.length >= 2);
    assert.ok(themes.every((t) => t.user_id === userId));
  });

  test('rejects empty id', async () => {
    await assert.rejects(
      () => client.listThemes({ id: '' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });
});

// ── UpdateTheme ───────────────────────────────────────────────────────────────

describe('UpdateTheme', () => {
  let userId: string;
  let themeId: string;

  before(async () => {
    userId = (await createTempUser('theme_update')).id;
    themeId = (await createTempTheme(userId)).id;
  });
  after(async () => { await client.deleteUser({ id: userId }); });

  test('updates the name', async () => {
    const updated = await client.updateTheme({ id: themeId, user_id: userId, name: 'Renamed' });
    assert.equal(updated.name, 'Renamed');
  });

  test('updates a single color field', async () => {
    const updated = await client.updateTheme({ id: themeId, user_id: userId, color_bg: '#123456' });
    assert.equal(updated.color_bg, '#123456');
  });

  test('partial update leaves other fields unchanged', async () => {
    const before = await client.getTheme({ id: themeId });
    await client.updateTheme({ id: themeId, user_id: userId, color_bg: '#FFFFFF' });
    const after = await client.getTheme({ id: themeId });
    assert.equal(after.color_main, before.color_main);
    assert.equal(after.color_text, before.color_text);
  });

  test('rejects invalid hex color', async () => {
    await assert.rejects(
      () => client.updateTheme({ id: themeId, user_id: userId, color_error: 'notahex' }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'color_error'); return true; },
    );
  });

  test('rejects empty theme id', async () => {
    await assert.rejects(
      () => client.updateTheme({ id: '', user_id: userId }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('returns PERMISSION_DENIED when user does not own the theme', async () => {
    const other = await createTempUser('tu_other');
    try {
      await assert.rejects(
        () => client.updateTheme({ id: themeId, user_id: other.id, color_bg: '#000000' }),
        (err) => { assertGrpcError(err, grpc.status.PERMISSION_DENIED); return true; },
      );
    } finally {
      await client.deleteUser({ id: other.id });
    }
  });

  test('returns NOT_FOUND for unknown theme id', async () => {
    await assert.rejects(
      () => client.updateTheme({ id: UNKNOWN_ID, user_id: userId, name: 'X' }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});

// ── DeleteTheme ───────────────────────────────────────────────────────────────

describe('DeleteTheme', () => {
  let userId: string;

  before(async () => { userId = (await createTempUser('theme_delete')).id; });
  after(async ()  => { await client.deleteUser({ id: userId }); });

  test('deletes a theme and makes it unreachable', async () => {
    const theme = await createTempTheme(userId);
    await client.deleteTheme({ id: theme.id, user_id: userId });
    await assert.rejects(
      () => client.getTheme({ id: theme.id }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('returns PERMISSION_DENIED when user does not own the theme', async () => {
    const theme = await createTempTheme(userId);
    const other = await createTempUser('td_other');
    try {
      await assert.rejects(
        () => client.deleteTheme({ id: theme.id, user_id: other.id }),
        (err) => { assertGrpcError(err, grpc.status.PERMISSION_DENIED); return true; },
      );
    } finally {
      await client.deleteUser({ id: other.id });
      await client.deleteTheme({ id: theme.id, user_id: userId });
    }
  });

  test('rejects empty theme id', async () => {
    await assert.rejects(
      () => client.deleteTheme({ id: '', user_id: userId }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('returns NOT_FOUND for unknown theme id', async () => {
    await assert.rejects(
      () => client.deleteTheme({ id: UNKNOWN_ID, user_id: userId }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });
});

// ── SetActiveTheme ────────────────────────────────────────────────────────────

describe('SetActiveTheme', () => {
  let userId: string;
  let themeId: string;

  before(async () => {
    userId = (await createTempUser('theme_active')).id;
    themeId = (await createTempTheme(userId)).id;
  });
  after(async () => { await client.deleteUser({ id: userId }); });

  test('sets the active theme and reflects it in the profile', async () => {
    await client.setActiveTheme({ user_id: userId, theme_id: themeId });
    const profile = await client.getProfile({ id: userId });
    assert.ok(profile.active_theme, 'profile should have an active theme');
    assert.equal(profile.active_theme?.id, themeId);
    assert.equal(profile.active_theme?.color_bg, '#7766BD');
  });

  test('active theme is included in GetUser response', async () => {
    const user = await client.getUser({ id: userId });
    assert.equal(user.profile?.active_theme?.id, themeId);
  });

  test('returns PERMISSION_DENIED when theme belongs to another user', async () => {
    const other = await createTempUser('ta_other');
    const otherTheme = await createTempTheme(other.id);
    try {
      await assert.rejects(
        () => client.setActiveTheme({ user_id: userId, theme_id: otherTheme.id }),
        (err) => { assertGrpcError(err, grpc.status.PERMISSION_DENIED); return true; },
      );
    } finally {
      await client.deleteUser({ id: other.id });
    }
  });

  test('returns NOT_FOUND for unknown theme', async () => {
    await assert.rejects(
      () => client.setActiveTheme({ user_id: userId, theme_id: UNKNOWN_ID }),
      (err) => { assertGrpcError(err, grpc.status.NOT_FOUND); return true; },
    );
  });

  test('rejects empty user_id', async () => {
    await assert.rejects(
      () => client.setActiveTheme({ user_id: '', theme_id: themeId }),
      (err) => { assertGrpcError(err, grpc.status.INVALID_ARGUMENT, 'id'); return true; },
    );
  });

  test('deleting active theme clears it from the profile', async () => {
    const tempTheme = await createTempTheme(userId, 'Temp Active');
    await client.setActiveTheme({ user_id: userId, theme_id: tempTheme.id });
    await client.deleteTheme({ id: tempTheme.id, user_id: userId });
    const profile = await client.getProfile({ id: userId });
    assert.ok(!profile.active_theme?.id, 'active_theme should be cleared after deletion');
  });
});
