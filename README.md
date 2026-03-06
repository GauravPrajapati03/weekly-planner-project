# Weekly Plan Tracker

## 🔗 Live Links
- **Frontend:** https://jolly-flower-0c7507b00.1.azurestaticapps.net/
- **Backend API:** https://weekly-planner-project-api.azurewebsites.net/health
- **API Docs (Swagger):** https://weekly-planner-project-api.azurewebsites.net/swagger/index.html

## 🛠️ Tech Stack
- Frontend: Angular 21 (TypeScript)
- Backend: .NET 8 (C#) — Clean Architecture
- Database: Azure SQL (via Entity Framework Core)
- Hosting: Azure Static Web Apps + Azure App Service + Azure SQL

## 🚀 Running Locally
### Backend
```bash
cd backend
dotnet run --project WeeklyPlanner.API
``` 

### Frontend
```bash
cd frontend/weekly-planner
npm install
ng serve
```

## ✅ Running Tests
### Backend
```bash
cd backend
dotnet test
```
### Frontend
```bash
cd frontend/weekly-planner
npm test
```