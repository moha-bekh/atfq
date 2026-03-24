import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve('./src/proto/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const userProto = (grpc.loadPackageDefinition(packageDefinition) as any).user;

const client = new userProto.UserService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// --- Promisified Helpers ---

const createAsync = (payload: any) => {
  return new Promise((resolve, reject) => {
    client.CreateUser(payload, (error: any, response: any) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
};

const updateAsync = (payload: any) => {
  return new Promise((resolve, reject) => {
    client.UpdateUser(payload, (error: any, response: any) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
};

const getAsync = (payload: any) => {
  return new Promise((resolve, reject) => {
    client.GetUser(payload, (error: any, response: any) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
};

const listAsync = (payload: any) => {
  return new Promise((resolve, reject) => {
    client.ListUsers(payload, (error: any, response: any) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
};

const deleteAsync = (payload: any) => {
  return new Promise((resolve, reject) => {
    client.DeleteUser(payload, (error: any, response: any) => {
      if (error) reject(error);
      else resolve(response);
    });
  });
};

// --- Test Sequence ---

const runTestSequence = async () => {
  console.log("🚀 Starting Refined gRPC Test Sequence (RBAC & Modifications)...\n");

  try {
    // 1. Create User
    console.log("1️⃣  Creating User_1...");
    const user1: any = await createAsync({
      username: "alpha_user",
      firstname: "Alpha",
      lastname: "Tester",
      email: "alpha@example.com"
    });
    console.log("✅ Created ID:", user1.id);

    // 2. Modify User_1
    console.log("\n2️⃣  Modifying User_1 (Firstname, Lastname, Email, Profile Picture)...");
    const updatedUser1: any = await updateAsync({
      id: user1.id,
      firstname: "Updated-Alpha",
      lastname: "Updated-Tester",
      email: "new-alpha@example.com",
      profile_picture: "https://example.com/alpha.png"
    });
    
    console.log("✅ Update Successful! Current state:");
    console.dir({
      fullName: `${updatedUser1.firstname} ${updatedUser1.lastname}`,
      email: updatedUser1.email,
      profile_picture: updatedUser1.profile?.profile_picture
    }, { depth: null });

    // 3. Verify change persistence via GetUser
    console.log("\n3️⃣  Verifying persistence via GetUser...");
    const fetched: any = await getAsync({ id: user1.id });
    if (fetched.firstname === "Updated-Alpha" && fetched.profile.profile_picture === "https://example.com/alpha.png") {
      console.log("✅ Data persistence verified.");
    } else {
      console.error("❌ Persistence check failed.");
    }

    // 4. Create User_2
    console.log("\n4️⃣  Creating User_2...");
    const user2: any = await createAsync({ 
      username: "beta_user", 
      firstname: "Beta", 
      lastname: "Tester", 
      email: "beta@example.com"
    });

    // 5. List All Users
    console.log("\n5️⃣  Fetching User list...");
    const allUsers: any = await listAsync({});
    const tableData = allUsers.users.map((u: any) => ({
      id: u.id,
      username: u.username,
      fullName: `${u.firstname} ${u.lastname}`,
      email: u.email,
      roles: u.roles?.join(', '),
      permissions: u.permissions?.join(', '),
      pic: u.profile?.profile_picture || 'none'
    }));
    console.table(tableData);

    // 6. Cleanup
    console.log("\n6️⃣  Cleaning up...");
    await deleteAsync({ id: user1.id });
    await deleteAsync({ id: user2.id });
    console.log("✅ Cleanup complete.");

  } catch (error: any) {
    console.error("\n❌ Test Failed:", error.details || error.message);
  }
};

runTestSequence();
