# Integration Plan

## Integration Results (2026-10-09)

- Applied EF Core migration `20261009131651_InitialCreate` to local SQL; it creates the constrained `Vehicles` schema only, with no seed data.
- Backend build and xUnit tests pass.
- Verified all seven routes: health/list `200`, valid detail `200`, missing detail/update/delete `404`, invalid create/upload `400`, and valid create/update/delete/upload `201`/`200`/`201`/`200`.
- Replaced the frontend mock client with a typed live client and configured the Vite `/api` proxy to `http://localhost:5040`; the mock module is removed.
- End-to-end requests through Vite reached SQL and Azurite. Health returned `200` with database and storage `ok`; a create/read/update/upload/delete cycle succeeded, and inventory returned to an empty list afterward.
- Frontend production build passes. Frontend mock-source scan is clean.
- To apply migrations: `dotnet tool restore` then `dotnet ef database update --project backend/Dealership.Api/Dealership.Api.csproj`.

## Backend
- Project folder: `backend/Dealership.Api`
- Build command: `export PATH="$HOME/.dotnet:$PATH" && cd backend && dotnet build Dealership.sln`
- Run command: `export PATH="$HOME/.dotnet:$PATH" && cd backend && dotnet run --project Dealership.Api/Dealership.Api.csproj`
- Local URL: `http://localhost:5040` (ASP.NET launch settings)
- Health endpoint: `GET /api/health`

## Frontend
- Project folder: `frontend`
- Build command: `npm --prefix frontend run build`
- Dev command: `npm --prefix frontend run dev -- --host 0.0.0.0`
- API seam: `frontend/src/api/index.ts` now exports the live client in `frontend/src/api/client.ts`
- Removed mock module: `frontend/src/api/mockClient.ts`

## API routes
- `GET /api/health`
- `GET /api/vehicles`
- `GET /api/vehicles/:id`
- `POST /api/vehicles`
- `PUT /api/vehicles/:id`
- `DELETE /api/vehicles/:id`
- `POST /api/upload`

## Database
- Type: Azure SQL / local SQL container via `docker-compose.yml`
- Migration tool: `dotnet ef migrations add` from the API project
- Connection variable: `DATABASE_URL`
- No seed data for integration; create schema migrations only

## Shared types
- Shared package location: `frontend/src/api` (scaffold seam) and `backend/Dealership.Api` models
- Typed client pattern: `frontend/src/api/types.ts` defines the client and vehicle contracts

## Services
- Essential: dealership inventory service, health service, upload service
- Enhancement: admin notifications and image metadata enrichment

## Notes
- Uploads are stored in the `vehicles` Blob container; each upload updates the vehicle image URL.
