export type DataType =
    | 'INTEGER'
    | 'BIGINT'
    | 'SMALLINT'
    | 'TINYINT'
    | 'VARCHAR'
    | 'TEXT'
    | 'CHAR'
    | 'BOOLEAN'
    | 'DATE'
    | 'DATETIME'
    | 'TIMESTAMP'
    | 'DECIMAL'
    | 'FLOAT'
    | 'DOUBLE'
    | 'JSON'
    | 'ENUM'
    | 'BLOB';

export type RelationshipType = 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_ONE' | 'MANY_TO_MANY';

export interface Position {
    x: number;
    y: number;
}

export interface ForeignKey {
    tableId: string;
    columnId: string;
    relationshipType?: RelationshipType;
    onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
    onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export interface Column {
    id: string;
    name: string;
    dataType: DataType;
    length?: string;
    nullable: boolean;
    primaryKey: boolean;
    unique: boolean;
    autoIncrement?: boolean;
    defaultValue?: string;
    comment?: string;
    enumValues?: string[];
    foreignKey?: ForeignKey;
}

export interface Table {
    id: string;
    name: string;
    columns: Column[];
    position: Position;
    color?: string;
    comment?: string;
}

export interface Relationship {
    id: string;
    type: RelationshipType;
    sourceTableId: string;
    sourceColumnId: string;
    targetTableId: string;
    targetColumnId: string;
    onDelete?: string;
    onUpdate?: string;
}

export interface DbSchemaData {
    tables: Table[];
    relationships: Relationship[];
}

export interface DbSchema {
    id: string;
    name: string;
    description?: string;
    data?: string; // JSON string of DbSchemaData
    created_at: String;
    updated_at: String;
}
