import Head from 'next/head';
import Navigation from './Navigation';
import { ReactNode } from 'react';

interface LayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  transparentHeader?: boolean;
  withPadding?: boolean;
}

export default function Layout({ 
  children, 
  title = 'CodeFlowAI',
  description = 'Generate comprehensive tutorials from your codebase',
  transparentHeader = false,
  withPadding = true 
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navigation transparent={transparentHeader} />

      <main className={`flex-grow ${withPadding ? 'pt-16' : ''}`}>
        {children}
      </main>

      <footer className="py-6 bg-white border-t border-gray-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-500 text-sm">
              Built with <a href="https://github.com/the-pocket/PocketFlow" target="_blank" rel="noopener noreferrer" className="text-wf-red hover:underline">
                PocketFlow
              </a>
            </p>
            <p className="mt-1 text-gray-400 text-xs">
              &copy; {new Date().getFullYear()} CodeFlowAI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 