import mariadb from "mariadb";

export const openDatabase = async () => {
  const connectionDetails = {
    user: process.env.DB_USERNAME ?? "drupal",
    password: process.env.DB_PASSWORD ?? "drupal",
    database: process.env.DB_NAME ?? "weathergov",
    host: process.env.DB_HOST ?? "database",
    port: process.env.DB_PORT ?? 3306,
  };

  return mariadb.createConnection(connectionDetails);
};

export default { openDatabase };
