export interface Tag {
  id: string;
  name: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateTagInput {
  name: string;
}

export interface UpdateTagInput {
  id: string;
  name?: string;
}

export interface DeleteTagInput {
  id: string;
}

export interface GetTagsParams {
  search?: string;
  limit?: number;
}

export interface TagList {
  tags: Tag[];
}
