# CKB Fund DAO UI

A decentralized governance platform for the CKB Community Fund DAO, built with Next.js and React.

## 🌟 Features

- **Proposal Management**: Create, view, and manage funding proposals with detailed project information
- **Voting System**: Participate in community voting with transparent vote tracking
- **Milestone Tracking**: Monitor project progress through milestone-based deliverables
- **Comment System**: Engage in community discussions with threaded comments and quote functionality
- **User Center**: Manage your profile, Web5 identity, and governance records
- **Treasury Overview**: View DAO treasury assets and transactions
- **Multi-language Support**: Available in English and Chinese
- **Wallet Integration**: Connect with CKB wallets for secure transactions
- **Web5/DID Support**: Decentralized identity management

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm

### Installation

1. Clone the repository:
```bash
git clone https://github.com/CCF-DAO1-1/ckb-fund-dao-ui.git
cd ckb-fund-dao-ui
```

2. Install dependencies:
```bash
pnpm install
```

3. Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_API_ADDRESS=https://app.ccfdao.org
```

4. Run the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Available Scripts

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production with Turbopack
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

## 🏗️ Tech Stack

- **Framework**: Next.js 15.5.2
- **React**: 19.1.0
- **Language**: TypeScript
- **Styling**: CSS Modules
- **State Management**: Zustand
- **Internationalization**: react-intl
- **Wallet Integration**: @ckb-ccc/connector-react
- **Web5/DID**: @atproto/repo, web5-api
- **Charts**: ECharts
- **Rich Text Editor**: react-quill-new
- **Notion Integration**: react-notion-x

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── [locale]/          # Internationalized routes
│   │   ├── proposal/      # Proposal pages
│   │   ├── treasury/      # Treasury pages
│   │   ├── user-center/   # User center pages
│   │   └── ...
│   └── api/               # API routes
├── components/            # React components
│   ├── proposal-phase/    # Proposal phase components
│   ├── proposal-steps/    # Proposal creation steps
│   ├── comment/           # Comment system components
│   └── ...
├── hooks/                 # Custom React hooks
├── lib/                   # Utility libraries
├── server/                # Server-side utilities
├── locales/               # Translation files
└── styles/                # CSS files
```

## 🌐 Internationalization

The application supports multiple languages:
- English (`en`)
- Chinese (`zh`)

Language files are located in `src/locales/` and `src/content/`.

## 🔐 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_ADDRESS` | API server address | `https://app.ccfdao.org` |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and proprietary.

## 🔗 Links

- **Live Demo**: [ckb-fund-dao-ui.vercel.app](https://ckb-fund-dao-ui.vercel.app)
- **Repository**: [https://github.com/CCF-DAO1-1/ckb-fund-dao-ui](https://github.com/CCF-DAO1-1/ckb-fund-dao-ui)

## 📝 Notes

- This project uses Turbopack for faster builds and development
- The application requires a CKB wallet connection for full functionality
- Web5/DID features require proper PDS (Personal Data Server) configuration

