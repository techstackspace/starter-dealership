# Project Plan

**Status**: Integrated
**Created**: 2026-10-09
**Mode**: NEW

---

## 1. Project Overview

**Goal**: Build a modern dealership website with public vehicle discovery, filtering, and a protected admin dashboard for inventory management and vehicle photo uploads. The project is designed so that every module is independently testable.

**App Type**: SPA + API

**API Login**: Yes

**Mode**: NEW

**Deployment Plan**: No deployment plan found

---

## 2. Backend — ASP.NET Core API

| Component | Technology |
|-----------|-----------|
| **Language** | C# |
| **Runtime** | .NET |
| **Package Manager** | dotnet (NuGet) |
| **Test Runner** | xUnit |
| **Mocking Library** | NSubstitute |
| **Test Command** | dotnet test |
| **Orchestration** | docker-compose |

> **Language vs Runtime**: `Language` is the source language the user picked in this service's `language` question. `Runtime` is the execution runtime — default `Node` for TypeScript/JavaScript, `CPython` for Python, `.NET` for C#. Only deviate from the default (e.g. `Bun`, `Deno`, `PyPy`) when the user explicitly asks. **Package Manager and Test Runner are language-dependent** — match them to this service's Language (e.g. C# → `dotnet (NuGet)` + `xUnit`/`NUnit`/`MSTest`). The `Orchestration` row is recorded for the scaffold step but hidden in the plan UI — always keep it set to `docker-compose`.

---

## 3. Frontend — React Web App

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Framework** | React + Vite |
| **Package Manager** | npm |
| **Test Runner** | vitest |
| **Mocking Library** | vi.mock |
| **Test Command** | npm test |

---

## 4. Services Required

| Azure Service | Role in App | Environment Variable | Default Value (Local) | Classification |
|---------------|------------|---------------------|----------------------|----------------|
| Azure SQL | Primary relational store for vehicle records, pricing, mileage, status, and admin metadata | DATABASE_URL | Server=tcp:localhost,1433;Database=dealership;User Id=sa;Password=YourStrong!Passw0rd;TrustServerCertificate=true; | Essential |
| Blob Storage | Store and serve vehicle photos and image assets | STORAGE_CONNECTION_STRING | UseDevelopmentStorage=true | Essential |

---

## 5. Prerequisites

Identify the required tools, then inventory them by following the project stack requirements. The local environment scan shows the application needs Node/npm for the frontend, .NET for the backend, and Docker for local orchestration and emulation.

### Run

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Node.js | frontend | ✅ | v24.15.0 |
| npm | frontend | ✅ | 11.12.1 |
| .NET SDK | backend | ❓ | N/A |
| Docker | backend, frontend | ✅ | 29.2.0 |
| Docker Compose | backend, frontend | ✅ | v5.0.2 |
| Azure CLI | global | ❓ | N/A |

### Debug

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| ms-dotnettools.csdevkit | backend | ❓ | N/A |
| ms-vscode.vscode-typescript-next | frontend | ❓ | N/A |
| ms-azuretools.vscode-docker | backend, frontend | ❓ | N/A |

> The environment check confirms Node.js, npm, Docker, and Docker Compose are available right now. Please double-check the ❓ rows before proceeding, especially the .NET SDK and Azure CLI required for backend work and deployment setup.

---

## 6. Design System & UI

**Component Library**: Fluent UI v9
**Style Direction**: A clean, premium automotive storefront with strong contrast, polished cards, and content-first layouts that keep pricing, mileage, and availability easy to scan.
**Typography**: Inter, system-ui

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#0F172A` | Main brand color for navigation, primary CTA buttons, and key dealership headings |
| `accent` | `#F97316` | Vehicle deal highlights, badges, and filter emphasis |
| `surface` | `#F8FAFC` | App background and neutral page surfaces |
| `text` | `#0F172A` | Body text and form labels |
| `muted` | `#64748B` | Secondary info, listing metadata, and captions |
| `border` | `#CBD5E1` | Card borders, dividers, and input outlines |

### Pages

| Page | Route | Purpose | Layout |
|------|-------|---------|--------|
| Home | `/` | Feature promotional inventory and value messaging for the dealership | `hero + grid + card-list` |
| Inventory | `/inventory` | Browse vehicle inventory with filters and sorting | `sidebar + table + card-list` |
| Vehicle Detail | `/inventory/:id` | Show the selected car details, media, and financing CTA | `two-column(media+meta) + action-bar` |
| Contact | `/contact` | Display dealership details and allow direct enquiries | `form + card-list` |
| Admin Dashboard | `/admin` | Manage vehicle listings, pricing, and status updates | `sidebar + table + actions` |

### Sample Content

```
Home — vehicles:
| Vehicle | Price | Status | Deal |
| 2024 Toyota RAV4 | $35,900 | Available | Certified |
| 2023 Honda CR-V | $29,480 | Available | Value Buy |
| 2022 BMW X5 | $49,750 | Low Stock | Premium |
| 2021 Ford F-150 | $33,200 | Available | Trade-In Ready |

Inventory — vehicles:
| Model | Year | Mileage | Price | Status |
| Toyota Corolla | 2024 | 12,400 | $28,900 | Available |
| Mazda CX-5 | 2023 | 17,300 | $26,700 | Available |
| Hyundai Tucson | 2022 | 21,100 | $24,200 | Pending |
| Nissan Altima | 2021 | 31,800 | $19,950 | Available |

Vehicle Detail — vehicle: 2024 Toyota RAV4 · Trim: XLE AWD · Price: $35,900 · Mileage: 12,400 · Status: Available

Contact — dealership: 123 Auto Lane, Downtown · Phone: (555) 014-2233 · Hours: Mon-Sat 9am-7pm

Admin Dashboard — vehicles:
| VIN | Model | Price | Status |
| 1HGBH41JXMN109186 | Toyota Corolla | $28,900 | Active |
| 2T2BK1BA7KC123456 | Mazda CX-5 | $26,700 | Active |
| 3VWJH7AN4JM114225 | Hyundai Tucson | $24,200 | Draft |
```

---

## 7. Project Structure

```
starter-dealership/
├─ .azure/
│  ├─ requirements.json
│  ├─ project-plan.md
│  └─ .preview-temp/
│     ├─ theme.css
│     └─ manifest.json
├─ backend/
│  ├─ src/
│  ├─ tests/
│  └─ Dealership.Api/
├─ frontend/
│  ├─ src/
│  ├─ public/
│  └─ tests/
├─ docker-compose.yml
├─ README.md
└─ package.json
```

---

## 8. Route Definitions

| # | Method | Path | Description | Request Body | Response Body | Status Codes |
|---|--------|------|-------------|-------------|--------------|-------------|
| 1 | GET | `/api/health` | Health check for the API and DB connectivity | — | `{ status, services }` | 200, 503 |
| 2 | GET | `/api/vehicles` | List available vehicles and filter by make, model, price, and status | — | `{ vehicles, total }` | 200 |
| 3 | GET | `/api/vehicles/:id` | Retrieve a single vehicle by ID | — | `{ vehicle }` | 200, 404 |
| 4 | POST | `/api/vehicles` | Create a new vehicle listing for the admin dashboard | `{ make, model, year, price, mileage, status, photos }` | `{ id, createdAt }` | 201, 400 |
| 5 | PUT | `/api/vehicles/:id` | Update inventory fields such as price, status, and mileage | `{ partial vehicle }` | `{ vehicle }` | 200, 400, 404 |
| 6 | DELETE | `/api/vehicles/:id` | Remove a listing from the public inventory | — | `{ success }` | 200, 404 |
| 7 | POST | `/api/upload` | Upload a vehicle image to Blob Storage and attach it to a listing | `{ file, vehicleId }` | `{ url, vehicleId }` | 201, 400 |

---

## 9. Next Steps

1. Run **azure-project-scaffold** to execute this plan
2. Run **azure-project-integrate** to wire the frontend to live data, smoke-test the backend, and create the migrations
3. Run **azure-debug-plan** → **azure-debug-generate** for Docker emulators and VS Code debugging
4. Run the **azure-deploy** agent when ready; it uses **azure-app-onboard** for architecture, cost estimation, IaC generation, provisioning, and health verification
