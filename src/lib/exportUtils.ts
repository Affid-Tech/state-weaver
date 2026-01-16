import JSZip from 'jszip';
import { generateTopicPuml, generateAggregatePuml } from './pumlGenerator';
import type { DiagramProject } from '@/types/diagram';

export async function exportProjectAsZip(project: DiagramProject): Promise<Blob> {
  const zip = new JSZip();
  
  // Folders: UPPERCASE
  const revision = project.instrument.revision.toUpperCase();
  const type = project.instrument.type.toUpperCase();
  
  const folder = zip.folder(`${revision}/${type}`);
  if (!folder) throw new Error('Failed to create ZIP folder');
  
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
  
  return zip.generateAsync({ type: 'blob' });
}

export async function exportMultipleProjectsAsZip(
  projects: DiagramProject[]
): Promise<Blob> {
  const zip = new JSZip();
  
  for (const project of projects) {
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
