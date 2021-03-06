const express = require("express");
const path = require("path");
const Handlebars = require("handlebars");
const expressHandlebars = require("express-handlebars");
const {
  allowInsecurePrototypeAccess,
} = require("@handlebars/allow-prototype-access");
const Task = require("./src/task");
const Project = require("./src/project");
const User = require("./src/user");
const { sequelize } = require("./src/db");
const handlebars = expressHandlebars({
  handlebars: allowInsecurePrototypeAccess(Handlebars),
});

sequelize.sync();

const app = express();
const port = 4000;

app.engine("handlebars", handlebars);
app.set("view engine", "handlebars");
app.use(express.static(path.join(__dirname, "public")));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.get("/", async (req, res) => {
  const projects = await Project.findAll();
  res.render("home", { projects });
});

app.get("/projects/new", async (req, res) => {
  res.render("newProject");
});

app.post("/projects", async (req, res) => {
  await Project.create(req.body);
  res.redirect("/");
});

app.get("/users/new", async (req, res) => {
  res.render("newUser");
});

app.post("/users", async (req, res) => {
  await User.create(req.body);
  res.redirect("/");
});

app.post("/projects/:id/tasks", async (req, res) => {
  const projectId = req.params.id;
  await Task.create({
    description: req.body.description,
    state: "todo",
    ProjectId: projectId,
    UserId: req.body.UserId,
  });
  res.redirect(`/projects/${projectId}`);
});

const dragStart = (event) => {
  event.target.className += "hold";
};

app.get("/tasks/:id", async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  res.render("project");
});

app.get("/projects/:id", async (req, res) => {
  const project = await Project.findByPk(req.params.id);
  const tasks = await project.getTasks({
    include: [User],
  });
  const users = await User.findAll();
  const columns = {
    todo: [],
    inProgress: [],
    done: [],
  };
  for (const task of tasks) {
    columns[task.state].push(task);
  }
  res.render("project", { project, columns, users });
});

app.get("/tasks/:taskId/delete", async (req, res) => {
  const task = await Task.findByPk(req.params.taskId);
  const projectId = task.ProjectId;
  task.destroy();
  res.redirect(`/projects/${projectId}`);
});

app.get("/projects/:id/delete", async (req, res) => {
  const project = await Project.findByPk(req.params.id);
  project.destroy();
  res.redirect(`/`);
});

app.patch("/tasks/:taskId", async (req, res) => {
  const id = req.params.taskId;
  const newColumn = req.body.column;
  const task = await Task.findByPk(id);
  task.state = newColumn;
  await task.save();
  res.sendStatus(200);
});

app.get("/tasks/:id/edit", async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  const users = await User.findAll();
  res.render("edit", { task, users });
});
app.post("/tasks/:id/edit", async (req, res) => {
  const task = await Task.findByPk(req.params.id);
  const projectId = task.ProjectId;
  await task.update(req.body);
  res.redirect(`/projects/${projectId}`);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
