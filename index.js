const express = require("express");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require("uuid");
var cors = require("cors");

const app = express();
const port = 7000;

// configure cors
app.use(cors());

//  parses incoming requests with JSON payloads
app.use(express.json());

// connect to database
mongoose
  .connect(
    "mongodb+srv://root:1qaz!QAZ@cluster0.d12o3ry.mongodb.net/?retryWrites=true&w=majority"
  )
  .then(() => console.log("Database connected successfully!"))
  .catch((err) => console.error(err));

// create task schema
const taskSchema = new mongoose.Schema(
  {
    uuid: {
      type: String,
      unique: true,
    },
    name: {
      type: String,
      unique: true,
      required: true,
    },
    isCompleted: {
      type: Boolean,
      required: true,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);
// complie schema into model
const Task = mongoose.model("Task", taskSchema);

// index
app.get("/api/tasks", async (req, res) => {
  try {
    // sort latest task with isCompleted false
    const tasks = await Task.find().sort({ createdAt: -1 }).exec();

    res.json({
      data: tasks,
      meta: {
        total: tasks.length,
      },
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// create
app.post("/api/tasks", async (req, res) => {
  const name = req.body.name?.trim();

  // req name value validation
  if (name == undefined) {
    return res.status(422).json({
      message: "Task name is required!",
    });
  }

  if (name.length < 5) {
    return res.status(422).json({
      message: "Task name should be more than 5 characters!",
    });
  }

  const task = new Task({
    uuid: uuidv4(),
    name,
  });

  try {
    const newTask = await task.save();

    res.json({
      message: "Task created successfully!",
      data: newTask,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

// update
app.put(
  "/api/tasks/:taskId",
  async (req, res, next) => {
    const task = await Task.findOne({ uuid: req.params.taskId });

    if (!task) {
      return res.status(404).json({
        message: `TaskID ${req.params.taskId} not found!`,
      });
    }

    // The variables set on res.locals are available within a single request-response cycle, and will not be shared between requests.
    res.locals.task = task;

    next();
  },
  async (req, res, next) => {
    const localTask = res.locals.task;

    const name = req.body.name?.trim();
    const { isCompleted } = req.body;

    if (name == undefined || isCompleted == undefined) {
      return res.status(422).json({
        message: "Task name or isCompleted status is required!",
      });
    }

    if (name.length < 5) {
      return res.status(422).json({
        message: "Task name should be more than 5 characters!",
      });
    }

    // name should be unique
    const isTaskNameExists = await Task.findOne({ name });

    if (isTaskNameExists && req.params.taskId != isTaskNameExists.uuid) {
      return res.status(422).json({
        message: "Task name should be unique",
      });
    }

    try {
      const updatedTask = await Task.findOneAndUpdate(
        { uuid: req.params.taskId },
        { name, isCompleted },
        {
          new: true,
        }
      );

      res.json({
        message: `TaskID ${req.params.taskId} updated successfully!`,
        data: updatedTask,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

// delete
app.delete(
  "/api/tasks/:taskId",
  async (req, res, next) => {
    const task = await Task.findOne({ uuid: req.params.taskId });

    if (!task) {
      return res.status(404).json({
        message: `TaskID ${req.params.taskId} not found!`,
      });
    }

    next();
  },
  async (req, res, next) => {
    try {
      await Task.deleteOne({ uuid: req.params.taskId });

      res.json({
        message: `TaskID ${req.params.taskId} deleted successfully!`,
      });
    } catch (err) {
      res.status(500).json({
        message: err.message,
      });
    }
  }
);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
