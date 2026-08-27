export const SQL_FORMAT_SAMPLE = {
  input: "select o.id, o.total, c.email from orders o join customers c on c.id = o.customer_id where o.total > 100 and o.status in ('paid','shipped') order by o.created_at desc limit 50",
};
