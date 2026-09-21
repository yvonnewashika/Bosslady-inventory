# Bosslady Inventory Management System

A web-based inventory management system designed to help businesses manage products, stock, sales, suppliers, expenses, and business reports from one platform.

The application is built with React and TypeScript and uses Supabase for database management and user authentication. The frontend is hosted using GitHub Pages.

## Features

* User registration and login
* Secure authentication using Supabase
* Dashboard with inventory and sales summaries
* Product management
* Product categories
* Supplier management
* Stock management
* Stock-in and stock-out movements
* Sales recording
* Expense management
* Inventory reports
* Sales reports
* Product performance tracking
* Low-stock monitoring
* Responsive user interface
* Supabase database integration

## Technology Stack

### Frontend

* React
* TypeScript
* Vite
* TanStack Router
* TanStack React Query
* Tailwind CSS
* Radix UI
* Lucide React
* Recharts

### Backend

* Supabase
* PostgreSQL
* Supabase Authentication

### Deployment

* GitHub
* GitHub Pages

## Project Structure

```text
src/
├── components/
├── integrations/
│   └── supabase/
├── lib/
├── routes/
├── assets/
├── router.tsx
└── main.tsx

android/
└── Android application files

supabase/
└── Database configuration
```

## Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* Git

### Clone the Repository

```bash
git clone <your-github-repository-url>
```

Navigate to the project directory:

```bash
cd <repository-name>
```

### Install Dependencies

```bash
npm install
```

### Environment Variables

Create a `.env` file in the root directory and add your Supabase configuration:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

The `.env` file should not be committed to GitHub.

### Run the Development Server

Start the application locally with:

```bash
npm run dev
```

The application will be available at the local development URL provided by Vite.

## Build for Production

Create a production build using:

```bash
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

## Deployment

The frontend is deployed using **GitHub Pages**.

The production build is generated from the React/Vite application and deployed through the GitHub repository.

## Backend

The application uses **Supabase** as its backend.

Supabase provides:

* PostgreSQL database
* User authentication
* Data storage
* Backend services
* Secure communication between the application and database

The Supabase backend is maintained separately from the frontend application.

## Application

**Bosslady Inventory Management System**

The system is designed to simplify inventory management and provide businesses with an organized way to monitor stock, sales, expenses, suppliers, and business performance.

## License

This project is intended for personal and business use.
