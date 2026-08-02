# Standards
This is an implementation of SAP MCP Server.

## Tech Stack
- **Framework**: Model Context Protocol (MCP).
- **Runtime**: Node.js
- **Language**: TypeScript

## Project Structure
- `src/`
  - `auth/`: Drivers for the auth method.
  - `tools/`: the MCP tools implemented.
  - `client.ts`: The base OData Client.
  - `handler.ts`: The base handler for the tool handlers to extend from.
  - `index.ts`: The main entry point for the application.
  - `server.ts`: The server definition.
  - `types.ts`: The type definitions for the application.
- `eslint.config.mjs`: Eslint config file.
- `tsconfig.json`: Typescript configuration file.

## Code Standards & Linting
- Code quality is enforced using **ESLint** and **Prettier** (integrated via ESLint plugin).
- Don't add padding anywhere in the code, no in the assignations no either in methods arguments.
- Methods declarations, arguments properties or fields, all of them need to follow alphabetically order.
- Private method need to start with double underscore (__) and they must be at the end of the file.
- Protected method need to start with single underscore (_) and they must be at the end of the file, after public methods.
- Public methods need to start with the method name and they must be at the beginning of the file.
- Variable names cannot be less than 3 characters except it is a underscore.
- Variable name need to be camelCase, meaningful but as short as possible.
- File name need to be dot sepparated and should avoid words from the path, for instance if you are creating a file in src/tools/odata/query, the file name should not contain words like "tools" or "odata" or "query".
- Class names should be PascalCase and they must be declared at the beginning of the file, right after the imports. The class name must reflect the file name with the proper prepend:
  - **Abstract**: All class names need to start with **A**.
  - **Handlers**: All class names need to start with **H**.
  - **Clients**: All class names need to start with **C**.
  - **Models**: All class names need to start with **M**.
  - **Types**: All class names need to start with **T**.
- Always use alias imports, never use relative imports.
- Type `any` is not allowed.
