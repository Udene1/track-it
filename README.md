# Tax1 Inventory Tracker

An advanced full-stack inventory management system designed for Nigerian businesses. Built with Next.js, Supabase, and MUI.

## Features
- **Real-time Inventory**: Live stock updates and low-stock alerts.
- **Sales Counter**: Record sales with automated 7.5% VAT calculation.
- **Purchase Logs**: Track stock inflows and costs.
- **PDF Receipts**: Generate professional NGN invoices on the fly.
- **Analytics Dashboard**: Visual charts for revenue and top-selling items.
- **Tax1 Integration**: Export data ready for tax compliance in Nigeria.

## Tech Stack
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, MUI.
- **Backend**: Supabase (PostgreSQL, Auth, Real-time).
- **Libraries**: Chart.js, PDFKit, Zod, React Hook Form.

## Setup Instructions

1.  **Clone the repository**.
2.  **Supabase Setup**:
    - Create a new project on [Supabase](https://supabase.com).
    - Run the SQL queries in `schema.sql` (found in the root) in the Supabase SQL Editor.
3.  **Environment Variables**:
    - Rename `.env.local.example` to `.env.local`.
    - Add your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4.  **Install Dependencies**:
    ```bash
    npm install
    ```
5.  **Run Locally**:
    ```bash
    npm run dev
    ```

## Deployment
This project is ready for Vercel. Connect your repository and ensure you add your Supabase environment variables in the Vercel dashboard.

## Notes
- The default VAT rate is set to 7.5% as per Nigerian tax laws.
- All data is protected by Supabase Row Level Security (RLS) and tied to the individual user account.
