import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
const region = "us-east-1";
const ddbClient = new DynamoDBClient({ region: region });
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

const tablename = "Users";

export const handler = async (event) => {
  let response;

  const getallusersPath = "/DynamoDBManager/getallusers";
  const userpath = "/DynamoDBManager/user";
  const body = JSON.parse(event.body);
  // event.payload.TableName = tablename;
  switch (true) {
    case event.httpMethod === "GET" && event.path === getallusersPath:
      response = getallusers();
      break;
    case event.httpMethod === "GET" && event.path === userpath:
      response = getSingleuser(event.queryStringParameters.id);
      // response = buildResponse(200, "hello there");
      break;
    case event.httpMethod === "POST" && event.path === userpath:
      // response = buildResponse(200 , event.queryStringParameters.id);
      response = saveUser(body);
      break;
    case event.httpMethod === "PUT" && event.path === userpath:
      response = updateUser(body);
      break;
    case event.httpMethod === "DELETE" && event.path === userpath:
      // response = buildResponse(200,bod1.payload);
      response = deleteUser(body.payload);
      // response = buildResponse(200, "hello there");
      break;
    default:
      response = buildResponse(404, "404 Not Found");
  }
  return response;
};

async function getallusers() {
  try {
    const command = new ScanCommand({
      TableName: tablename,
    });

    const response = await ddbDocClient.send(command);

    if (response.Items) {
      const allUsers = {
        users: response.Items || [],
      };
      return buildResponse(200, allUsers);
    }
    return buildResponse(500, { message: "No users found" });
  } catch (error) {
    // console.error("Error in getallusers:", error);
    return buildResponse(500, { message: "from the catch", error: error });
  }
}

async function getSingleuser(id) {
  if (!id) {
    return buildResponse(400, "id not found in parameters");
  } else {
    const command = new GetCommand({
      TableName: tablename,
      Key: {
        id: id,
      },
    });

    try {
      let response = await ddbDocClient.send(command);

      // Check if the response is null or undefined
      if (!response.Item) {
        return buildResponse(400, "id not found in table");
      }

      // If response is not null, return the item
      return buildResponse(200, response.Item);
    } catch (error) {
      return buildResponse(500, { message: "from the catch", error: error });
    }
  }
}

async function saveUser(body) {
  if (!body.payload) {
    return buildResponse(400, "payload not found");
  } else {
    const command = new PutCommand({
      TableName: tablename,
      Item: body.payload.Item,
      ConditionExpression: "attribute_not_exists(id)",
    });

    try {
      let response = await ddbDocClient.send(command);
      return buildResponse(200, response);
    } catch (error) {
      return buildResponse(500, error);
    }
  }
}

async function updateUser(body) {
  //--------------structure of update command------------------
  //  const updateCommand = new UpdateCommand({
  //     TableName: "YourTableName",
  //     Key: {
  //       id: "1234ABCD", // Assuming "id" is the primary key
  //     },
  //     UpdateExpression: "SET firstName = :newFirstName, lastName = :newLastName, age = :newAge",
  //     ExpressionAttributeValues: {
  //       ":newFirstName": "John",
  //       ":newLastName": "Doe",
  //       ":newAge": 30,
  //     },
  //     ReturnValues: "ALL_NEW",
  //   });
  //------------------------------------------------------------
  if (!body.payload) {
    return buildResponse(400, "payload not found");
  } else {
    const updateAttributes = body.payload.attributes;

    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    const setExpressions = [];

    // Build the UpdateExpression and ExpressionAttributeValues dynamically
    //building this as we have nosql db so in future many attributes may add and we need to change so this is dynamically building it
    Object.keys(updateAttributes).forEach((attributeName) => {
      const valuePlaceholder = `:${attributeName}`;
      const namePlaceholder = `${attributeName}`;

      expressionAttributeValues[valuePlaceholder] =
        updateAttributes[attributeName];
      expressionAttributeNames[namePlaceholder] = attributeName;

      setExpressions.push(`${namePlaceholder} = ${valuePlaceholder}`);
    });

    const command = new UpdateCommand({
      TableName: tablename,
      Key: {
        id: body.payload.id, // Assuming "id" is the primary key
      },
      UpdateExpression: `SET ${setExpressions.join(", ")}`,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    });

    try {
      let response = await ddbDocClient.send(command);
      return buildResponse(200, response);
    } catch (error) {
      return buildResponse(500, {
        message: "from the catch",
        error: error.name,
      });
    }
  }
}

async function deleteUser(body) {
  if (!body.Key.id) {
    return buildResponse(400, "id not found in parameters");
  } else {
    body.TableName = tablename;
    // this will return the old message
    body.ReturnValues = "ALL_OLD";
    const command = new DeleteCommand(body);

    try {
      let response = await ddbDocClient.send(command);
      return buildResponse(200, response);
    } catch (error) {
      return buildResponse(500, { message: "from the catch", error: error });
    }
  }
}

function buildResponse(statusCode, body) {
  return {
    statusCode: statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  };
}
