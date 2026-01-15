import { TopBar } from '@/components/layout/TopBar';
import { StructureSidebar } from '@/components/sidebar/StructureSidebar';
import { InspectorPanel } from '@/components/sidebar/InspectorPanel';
import { DiagramCanvas } from '@/components/canvas/DiagramCanvas';
import { PreviewPanel } from '@/components/preview/PreviewPanel';

const Index = () => {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar />
      <div className="flex-1 flex min-h-0">
        <StructureSidebar />
        <main className="flex-1 flex flex-col min-w-0">
          <DiagramCanvas />
          <PreviewPanel />
        </main>
        <InspectorPanel />
      </div>
    </div>
  );
};

export default Index;
