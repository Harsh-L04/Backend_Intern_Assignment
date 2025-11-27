# Multi-Tenant Organization Backend (Node.js + MongoDB)

A simple multi-tenant backend that manages organizations with dynamic MongoDB collections, master metadata, and JWT-based admin authentication.

## Tech Stack

- Node.js
- Express
- MongoDB (single master DB)
- Mongoose
- JWT (jsonwebtoken)
- bcryptjs
- dotenv

## Getting Started

### Prerequisites

- Node.js (>= 18)
- MongoDB running locally or in the cloud

### Installation

```bash
git clone <your-repo-url>
cd multi-tenant-org-backend
cp .env.example .env
# edit .env with your values
npm install
