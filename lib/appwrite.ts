import { Client, Account, ID, TablesDB, Query } from "appwrite";

export const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

export const account = new Account(client);
export const tablesDB = new TablesDB(client);

export const DB_ID = process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID!;
export const ITEMS_TABLE = process.env.NEXT_PUBLIC_APPWRITE_ITEMS_TABLE_ID!;

export { ID, Query };