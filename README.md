# Study Dataset Simulator (WORK IN PROGRESS) 

A web-based tool for designing and simulating study datasets. This application allows users to define variables (Continuous, Nominal, Ordinal) and their distributions, enabling the generation of synthetic datasets for research and testing purposes.

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)

## Prerequisites

-   **Deno**: Required for the API and shared packages. [Install Deno](https://deno.land/#installation)
-   **Node.js & npm**: Required for the Web application (Nuxt.js). [Install Node.js](https://nodejs.org/)

## Getting Started

### 1. Installation

Clone the repository and install dependencies.

**Web App (Nuxt.js):**
```bash
cd apps/web
npm install
```

**API & Shared (Deno):**
Deno caches dependencies on the fly, so no explicit install step is usually needed.

### 2. Running Development Servers

You need to run both the API and the Web application for the full experience.

**Terminal 1: API (Deno)**
Runs on `http://localhost:8000` (default)
```bash
# From project root
deno task dev:api
```

**Terminal 2: Web App (Nuxt 3)**
Runs on `http://localhost:3000`
```bash
# From apps/web
cd apps/web
npm run dev
```

## Project Structure

-   `apps/web`: The frontend application built with **Nuxt 3**, **Vuetify**, and **Vue 3**.
-   `apps/api`: The backend service built with **Hono** and **Deno**.
-   `packages/shared`: Shared TypeScript types and logic (ArkType schemas) used by both apps.

## Features

-   **Variable Management**: Add, edit, and remove variables.
-   **Data Types**: Support for Continuous, Nominal, and Ordinal data.
-   **Distributions**: Configure Normal and Uniform distributions.
-   **Validation**: Real-time validation for names, categories, and parameters.
-   **Drag & Drop**: Reorder variables and categories easily.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
