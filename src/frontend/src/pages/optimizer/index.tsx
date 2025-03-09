import React from 'react';
import { FlowEditor } from './components/flow/FlowEditor';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-4 px-4">
        <FlowEditor />
        
        <footer className="mt-10 text-center text-sm text-muted-foreground">
          <p>
          Optimize your prompts for LLM Controls with ai agents.
          </p>
        </footer>
      </div>
    </div>
  );
}