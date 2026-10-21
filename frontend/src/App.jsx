import NewTaskForm from "./components/NewTaskForm";
import TaskList from "./components/TaskList";
import Footer from "./components/Footer";

import { useEffect, useState } from "react";
import "./App.css";
import TasksFilter from "./components/TasksFilter";

import { io } from "socket.io-client";

function App() {
  const API_URL = import.meta.env.VITE_API_URL;
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    const socket = io(API_URL);

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);

      socket.emit("workspace:join", {
        workspace: "default",
        username: "Guest",
      });
    });

    socket.on("presence:update", (data) => {
      setOnlineUsers(data.users);
    });

    socket.on("todo:created", (newTodo) => {
      console.log("New todo received:", newTodo);
      setTasks((prev) => {
        const exists = prev.some((task) => task._id === newTodo._id);

        if (exists) return prev;

        return [newTodo, ...prev];
      });
    });

    socket.on("todo:updated", (updatedTodo) => {
      console.log("Todo updated:", updatedTodo);
      setTasks((prev) =>
        prev.map((task) => (task._id === updatedTodo._id ? updatedTodo : task)),
      );
    });

    socket.on("todo:deleted", ({ id }) => {
      console.log("Todo deleted:", id);

      setTasks((prev) => prev.filter((task) => task._id !== id));

      setEditingTaskId((prev) => (prev === id ? null : prev));
    });

    return () => {
      socket.disconnect();
    };
  }, [API_URL]);

  //api from backend
  useEffect(() => {
    fetch(`${API_URL}/api/todos`)
      .then((response) => response.json())
      .then((data) => {
        setTasks(data);
      })
      .catch((error) => {
        console.error("Failed to fetch todos:", error);
      });
  }, []);

  const toggleStatus = (id) => {
    fetch(`${API_URL}/api/todos/${id}/toggle`, {
      method: "PATCH",
    })
      .then((response) => response.json())
      .then((updatedTask) => {
        setTasks((prev) =>
          prev.map((task) =>
            task._id === updatedTask._id ? updatedTask : task,
          ),
        );
      })
      .catch((error) => {
        console.error("Failed to toggle todo:", error);
      });
  };

  const deleteTask = (id) => {
    fetch(`${API_URL}/api/todos/${id}`, {
      method: "DELETE",
    })
      .then((response) => response.json())
      .then(() => {
        setTasks((prevTasks) => prevTasks.filter((task) => task._id !== id));

        setEditingTaskId((prev) => (prev === id ? null : prev));
      })
      .catch((error) => {
        console.error("Failed to delete todo:", error);
      });
  };

  const updateTask = (id, newTitle) => {
    fetch(`${API_URL}/api/todos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: newTitle,
      }),
    })
      .then((response) => response.json())
      .then((updatedTask) => {
        setTasks((prev) =>
          prev.map((task) =>
            task._id === updatedTask._id ? updatedTask : task,
          ),
        );

        setEditingTaskId(null);
      })
      .catch((error) => {
        console.error("Failed to update todo:", error);
      });
  };

  const toggleEdit = (id) => {
    setEditingTaskId((prev) => (prev === id ? null : id));
  };

  const addTask = (text) => {
    fetch(`${API_URL}/api/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: text,
      }),
    })
      .then((response) => response.json())
      .then((newTask) => {
        setTasks((prev) => {
          const exists = prev.some((task) => task._id === newTask._id);

          if (exists) return prev;

          return [newTask, ...prev];
        });
      })
      .catch((error) => {
        console.error("Failed to create todo:", error);
      });
  };

  const [filter, setFilter] = useState("All");

  const filteredTasks = tasks.filter((task) => {
    if (filter === "Active") return !task.completed;
    if (filter === "Completed") return task.completed;
    return true;
  });
  const activeTasks = tasks.filter((task) => !task.completed).length;

  const clearCompleted = () => {
    const completedTasks = tasks.filter((task) => task.completed);

    Promise.all(
      completedTasks.map((task) =>
        fetch(`${API_URL}/api/todos/${task._id}`, {
          method: "DELETE",
        }),
      ),
    )
      .then(() => {
        setTasks((prev) => prev.filter((task) => !task.completed));
      })
      .catch((error) => {
        console.error("Failed to clear completed todos:", error);
      });
  };

  return (
    <section className="todoapp">
      <p>🟢 Online: {onlineUsers.length}</p>

      <NewTaskForm addTask={addTask} />

      <TaskList
        tasks={filteredTasks}
        toggleStatus={toggleStatus}
        deleteTask={deleteTask}
        updateTask={updateTask}
        toggleEdit={toggleEdit}
        editingTaskId={editingTaskId}
      />

      <Footer clearCompleted={clearCompleted} activeTasks={activeTasks}>
        <TasksFilter filter={filter} setFilter={setFilter} />
      </Footer>
    </section>
  );
}

export default App;
