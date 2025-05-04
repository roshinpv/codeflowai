# Tutorial Generator Frontend

A Next.js frontend for the CodeFlowAI.

## Features

- Submit tutorial generation requests with GitHub repositories or local directories
- Monitor job status in real-time
- View generated tutorials with:
  - Syntax highlighting for code blocks
  - Mermaid diagram support
  - Navigation between chapters
  - Responsive design

## Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend server running (see backend/README.md)

### Installation

1. Install dependencies:

```bash
cd frontend
npm install
# or
yarn install
```

2. Start the development server:

```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) with your browser.

## Configuration

The Next.js application proxies API requests to the backend using rewrites in `next.config.js`. The default backend URL is `http://localhost:8000`. If your backend is running on a different URL, update the `next.config.js` file.

## Build for Production

```bash
npm run build
# or
yarn build
```

Then start the production server:

```bash
npm run start
# or
yarn start
``` 