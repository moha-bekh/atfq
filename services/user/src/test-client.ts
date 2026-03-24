import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve('./src/proto/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true, // This ensures 'false' and empty strings are not omitted
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
  console.log("🚀 Starting Refined gRPC Test Sequence (RBAC & Atomic Transaction)...\n");

  try {
    // 1. Create User with Email
    console.log("1️⃣  Creating User_1 (Expects Atomic Profile & Role creation)...");
    const user1: any = await createAsync({
      username: "alpha_user",
      firstname: "Alpha",
      lastname: "Tester",
      email: "alpha@example.com"
    });
    console.log("✅ User created successfully!");
    console.log("Full Object for User_1 (Detailed View):");
    console.dir(user1, { depth: null });

    // 2. Verify Profile Defaults and Roles
    console.log(`\n2️⃣  Verifying Profile Mapping and Roles for User_1...`);
    const hasCorrectRole = user1.roles && user1.roles.includes('user');
    const hasCorrectTheme = user1.profile && user1.profile.dark_theme === false;

    if (hasCorrectRole && hasCorrectTheme) {
      console.log("✅ Profile defaults and 'user' role assignment verified.");
    } else {
      console.error("❌ Verification failed: check roles or profile defaults.");
    }

    // 3. Test Identity Uniqueness
    console.log("\n3️⃣  Testing Duplicate Username/Email protection...");
    try {
      await createAsync({ 
        username: "alpha_user", 
        firstname: "Duplicate", 
        lastname: "User",
        email: "other@example.com" 
      });
    } catch (error: any) {
      console.log(`✅ Correctly rejected: ${error.details}`);
    }

    // 4. Create User_2
    console.log("\n4️⃣  Creating User_2...");
    const user2: any = await createAsync({ 
      username: "beta_user", 
      firstname: "Beta", 
      lastname: "Tester", 
      email: "beta@example.com"
    });
    console.log("✅ Success! ID:", user2.id);

    // 5. List All Users (Comprehensive Table)
    console.log("\n5️⃣  Fetching complete User list with all fields...");
    const allUsers: any = await listAsync({});
    
    // Mapping for a readable table view including all proto fields
	const tableData = allUsers.users.map((u: any) => ({
	  id: u.id,
	  username: u.username,
	  email: u.email,
	  roles: u.roles ? u.roles.join(', ') : 'none',
	  permissions: u.permissions ? u.permissions.join(', ') : 'none', // Added for visibility 
	  lang: u.profile?.language
	}));
    console.table(tableData);

    // 6. Cleanup
    console.log("\n6️⃣  Cleaning up database...");
    await deleteAsync({ id: user1.id });
    await deleteAsync({ id: user2.id });
    console.log("✅ Test users deleted.");

  } catch (error: any) {
    console.error("\n❌ Test Sequence Failed:", error.details || error.message);
  }
};

runTestSequence();
