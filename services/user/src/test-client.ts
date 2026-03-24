import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';

const PROTO_PATH = path.resolve('./src/proto/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH);
const userProto = (grpc.loadPackageDefinition(packageDefinition) as any).user;

const client = new userProto.UserService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

// Manual Promise Wrappers (Bypasses promisify completely)
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

const runTestSequence = async () => {
  console.log("🚀 Starting Automated gRPC Test Sequence...\n");

  try {
    // Step 1: Create User_1
    console.log("1️⃣  Creating User_1...");
    const user1: any = await createAsync({ 
      username: "User_1", 
      firstname: "FirstName", 
      lastname: "LastName" 
    });
    console.log("✅ Success! ID:", user1.id);

    // Step 2: Get User_1 by ID and print data
    console.log(`\n2️⃣  Fetching User_1 data...`);
    const fetchedUser1: any = await getAsync({ id: user1.id });
    console.table(fetchedUser1);

    // Step 3: Try to create User_1 again (Should fail)
    console.log("\n3️⃣  Attempting to create User_1 again...");
    try {
      await createAsync({ 
        username: "User_1", 
        firstname: "FirstName", 
        lastname: "LastName" 
      });
    } catch (error: any) {
      console.log(`✅ Correctly rejected: ${error.details}`);
    }

    // Step 4: Create User_2, get ID, print data
    console.log("\n4️⃣  Creating User_2...");
    const user2: any = await createAsync({ 
      username: "User_2", 
      firstname: "FirstName", 
      lastname: "LastName" 
    });
    console.log("✅ Success! ID:", user2.id);

    console.log(`Fetching User_2 data...`);
    const fetchedUser2: any = await getAsync({ id: user2.id });
    console.table(fetchedUser2);

    // Step 5: Print all users in the table
    console.log("\n5️⃣  Fetching complete User table...");
    const allUsers: any = await listAsync({});
    console.table(allUsers.users);

  } catch (error: any) {
    console.error("\n❌ Unexpected Sequence Failure:", error.message || error);
  }
};

runTestSequence();
