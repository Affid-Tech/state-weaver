export interface FieldConfig {
  revisions: string[];
  instrumentTypes: string[];
  topicTypes: string[];
  messageTypes: string[];
  flowTypes: string[];
  flowTypeColors?: Record<string, string>;
}

export const DEFAULT_FIELD_CONFIG: FieldConfig = {
  revisions: [],
  instrumentTypes: [],
  topicTypes: [],
  messageTypes: [],
  flowTypes: [],
  flowTypeColors: {},
};
