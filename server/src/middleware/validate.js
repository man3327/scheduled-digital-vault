// Usage: validate({ body: schema, params: schema, query: schema })
// Parsed (cleaned) data replaces the raw input. Invalid input throws a ZodError,
// and the error handler turns that into a 400 response.
export const validate = (schemas) => (req, res, next) => {
  if (schemas.params) req.params = schemas.params.parse(req.params);
  if (schemas.body) req.body = schemas.body.parse(req.body ?? {});
  if (schemas.query) req.validatedQuery = schemas.query.parse(req.query);
  next();
};