const API_BASE = "https://portfolio-api-three-black.vercel.app/api/v1";

function initializeLogin() {
  const loginForm = document.getElementById("login-form");
  if (!loginForm) return;

  if (new URLSearchParams(location.search).get("acceso") === "denegado") {
    document.getElementById("aviso").hidden = false;
  }

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submit = document.getElementById("login-submit");
    submit.disabled = true;
    submit.textContent = "Entrando...";

    try {
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo iniciar sesión.");
      if (typeof data.token !== "string" || !data.token.trim()) {
        throw new Error("La respuesta del servidor no incluye un token de sesión válido.");
      }

      const user = data.user || data.userPublicData;
      if (!user || typeof user !== "object") {
        throw new Error("La respuesta del servidor no incluye los datos de la cuenta.");
      }

      localStorage.setItem("authToken", data.token);
      localStorage.setItem("authUser", JSON.stringify(user));
      window.location.replace("home.html");
    } catch (error) {
      const aviso = document.getElementById("aviso");
      aviso.textContent = error.message;
      aviso.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  });
}

function initializeRegister() {
  const registerForm = document.getElementById("register-form");
  if (!registerForm) return;

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const alert = document.getElementById("register-alert");
    const submit = document.getElementById("register-submit");
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;

    if (password !== confirm) {
      alert.textContent = "Las contraseñas no coinciden.";
      alert.hidden = false;
      return;
    }

    submit.disabled = true;
    submit.textContent = "Registrando...";
    alert.hidden = true;

    try {
      const user = {
        name: document.getElementById("name").value.trim(),
        email: document.getElementById("email").value.trim(),
        itsonId: document.getElementById("itsonId").value.trim(),
        password
      };
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user)
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "No se pudo crear la cuenta.");

      alert.className = "alert alert--success";
      alert.textContent = "Cuenta creada correctamente. Ya puedes iniciar sesión.";
      alert.hidden = false;
      registerForm.reset();
    } catch (error) {
      alert.className = "alert";
      alert.textContent = error.message;
      alert.hidden = false;
    } finally {
      submit.disabled = false;
      submit.textContent = "Registrarme";
    }
  });
}

function initializeHome() {
  const home = document.getElementById("projects-grid");
  if (!home) return;

  const token = localStorage.getItem("authToken");
  const userJson = localStorage.getItem("authUser");
  let user = null;
  try {
    user = userJson ? JSON.parse(userJson) : null;
  } catch {
    user = null;
  }

  function redirectToLogin() {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    window.location.replace("login.html?acceso=denegado");
  }

  if (!token) {
    redirectToLogin();
    return;
  }

  const alert = document.getElementById("project-alert");
  const form = document.getElementById("project-form");

  if (user?.name) document.getElementById("welcome").textContent = `Bienvenido, ${user.name}.`;

  function showAlert(message, success = false) {
    alert.textContent = message;
    alert.className = success ? "alert alert--success" : "alert";
    alert.hidden = false;
  }

  function splitValues(value) {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "auth-token": token,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers
      }
    });
    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      throw new Error("Tu sesión no es válida. Inicia sesión de nuevo.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "La solicitud no pudo completarse.");
    return data;
  }

  function openProjectForm(project = null) {
    document.getElementById("project-form-title").textContent =
      project ? "Actualizar proyecto" : "Nuevo proyecto";
    document.getElementById("project-id").value = project?._id || "";
    document.getElementById("title").value = project?.title || "";
    document.getElementById("description").value = project?.description || "";
    document.getElementById("technologies").value = project?.technologies?.join(", ") || "";
    document.getElementById("repository").value = project?.repository || "";
    document.getElementById("images").value = project?.images?.join(", ") || "";
    form.hidden = false;
    document.getElementById("title").focus();
  }

  function closeProjectForm() {
    form.reset();
    form.hidden = true;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function renderProjects(projects) {
    home.replaceChildren();
    if (!projects.length) {
      home.appendChild(createElement("p", "card__subtitle", "No tienes proyectos registrados."));
      return;
    }

    projects.forEach((project) => {
      const card = createElement("article", "project-card");
      card.appendChild(createElement("h2", "", project.title));
      card.appendChild(createElement("p", "project-description", project.description));

      if (project.technologies?.length) {
        const technologies = createElement("p", "project-technologies");
        technologies.textContent = `Tecnologías: ${project.technologies.join(", ")}`;
        card.appendChild(technologies);
      }

      if (project.images?.length) {
        project.images.forEach((source) => {
          const image = createElement("img", "project-image");
          image.src = source;
          image.alt = `Imagen del proyecto ${project.title}`;
          image.loading = "lazy";
          card.appendChild(image);
        });
      }

      if (project.repository) {
        const repository = createElement("a", "project-link", "Ver repositorio");
        repository.href = project.repository;
        repository.target = "_blank";
        repository.rel = "noopener noreferrer";
        card.appendChild(repository);
      }

      const actions = createElement("div", "project-actions");
      const update = createElement("button", "btn", "Actualizar");
      update.type = "button";
      update.addEventListener("click", () => editProject(project._id));

      const remove = createElement("button", "btn btn--ghost", "Eliminar");
      remove.type = "button";
      remove.addEventListener("click", () => deleteProject(project._id));

      actions.append(update, remove);
      card.appendChild(actions);
      home.appendChild(card);
    });
  }

  async function loadProjects() {
    const projects = await apiRequest("/projects");
    if (!Array.isArray(projects)) {
      throw new Error("La respuesta de proyectos no tiene el formato esperado.");
    }
    renderProjects(projects);
  }

  async function editProject(projectId) {
    try {
      const project = await apiRequest(`/projects/${projectId}`);
      if (!project || typeof project !== "object") {
        throw new Error("No se pudo obtener el proyecto seleccionado.");
      }
      openProjectForm(project);
    } catch (error) {
      showAlert(error.message);
    }
  }

  async function verifySession() {
    try {
      await loadProjects();
      document.body.classList.remove("auth-checking");
    } catch (error) {
      if (!localStorage.getItem("authToken")) return;
      document.getElementById("auth-status-message").textContent =
        `No se pudo verificar la sesión: ${error.message}`;
      document.getElementById("auth-status").hidden = false;
    }
  }

  async function deleteProject(projectId) {
    if (!window.confirm("¿Eliminar este proyecto?")) return;
    try {
      await apiRequest(`/projects/${projectId}`, { method: "DELETE" });
      showAlert("Proyecto eliminado.", true);
      await loadProjects();
    } catch (error) {
      showAlert(error.message);
    }
  }

  document.getElementById("show-project-form").addEventListener("click", () => openProjectForm());
  document.getElementById("cancel-project").addEventListener("click", closeProjectForm);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const projectId = document.getElementById("project-id").value;
    const submit = document.getElementById("save-project");
    const project = {
      title: document.getElementById("title").value.trim(),
      description: document.getElementById("description").value.trim(),
      userId: user?.id,
      technologies: splitValues(document.getElementById("technologies").value),
      repository: document.getElementById("repository").value.trim(),
      images: splitValues(document.getElementById("images").value)
    };

    submit.disabled = true;
    submit.textContent = "Guardando...";
    try {
      if (projectId) {
        await apiRequest(`/projects/${projectId}`, {
          method: "PUT",
          body: JSON.stringify(project)
        });
        showAlert("Proyecto actualizado.", true);
      } else {
        await apiRequest("/projects", {
          method: "POST",
          body: JSON.stringify(project)
        });
        showAlert("Proyecto agregado.", true);
      }
      closeProjectForm();
      await loadProjects();
    } catch (error) {
      showAlert(error.message);
    } finally {
      submit.disabled = false;
      submit.textContent = "Guardar";
    }
  });

  document.getElementById("logout").addEventListener("click", redirectToLogin);
  document.getElementById("retry-auth").addEventListener("click", () => {
    document.getElementById("auth-status").hidden = true;
    verifySession();
  });

  if (token) verifySession();
}

initializeLogin();
initializeRegister();
initializeHome();
