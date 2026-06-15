# Rest_POS Web Version

Web rewrite of the SoftVinz restaurant POS — Angular PWA front end + .NET 9 Web API backend, backed by the existing SQL Server 2014 database.

See [Agentdocs/Rest_POS_Web_Plan.md](Agentdocs/Rest_POS_Web_Plan.md) for the full architecture and build plan.

## Quick start

### Backend
```bash
cd backend
dotnet restore
dotnet run --project src/RestPos.Api
# Swagger: http://localhost:5000/swagger
```

### Frontend
```bash
cd frontend
npm install
ng serve
# App: http://localhost:4200
```

## Structure
```
Agentdocs/      Living project documentation
backend/        .NET 9 Web API solution (RestPos.sln)
frontend/       Angular PWA workspace
```
