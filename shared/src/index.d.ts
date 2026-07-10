export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

export declare const createApiErrorBody: (
  code: string,
  message: string,
  fields?: Record<string, string>,
) => ApiErrorBody;

export declare const isApiErrorBody: (value: unknown) => value is ApiErrorBody;
