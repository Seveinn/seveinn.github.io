export interface SkillNode {
  id: string;
  icon: string;
  title: string;
  type: 'root' | 'branch' | 'skill';
  x: number;
  y: number;
  level?: number;
  progress?: number;
  color?: string;
}

export interface SkillTreeConfig {
  version?: string;
  nodes: SkillNode[];
  connections: [string, string][];
}










