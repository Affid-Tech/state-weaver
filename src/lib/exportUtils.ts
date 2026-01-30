import JSZip from 'jszip';
import {generateAggregatePuml, generateTopicPuml} from './pumlGenerator';
import type {DiagramState} from '@/store/diagramStore';


export async function exportProjectAsZip(
  state: DiagramState
): Promise<Blob> {
  const zip = new JSZip();

  zip.folder("builder").file("statemachine_snapshot.json", state.exportProject())

  for (const project of state.projects) {
    // Folders: UPPERCASE
    const revision = project.instrument.revision.toUpperCase();
    const type = project.instrument.type.toUpperCase();
    
    const folder = zip.folder(`${revision}/${type}`);
    if (!folder) continue;
    
    // Add individual topic PUML files (lowercase)
    for (const topicData of project.topics) {
      const puml = generateTopicPuml(project, topicData.topic.id);
      if (puml) {
        folder.file(`${topicData.topic.id.toLowerCase()}.puml`, puml);
      }
    }
    
    // Add aggregated PUML (lowercase)
    const aggregatePuml = generateAggregatePuml(project);
    if (aggregatePuml) {
      folder.file('complete.puml', aggregatePuml);
    }
  }
  
  return zip.generateAsync({ type: 'blob' });
}
