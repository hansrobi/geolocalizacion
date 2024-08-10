document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const grupoSelect = document.getElementById("grupo-select");
    const addUserForm = document.getElementById("add-user-form");
    const loginContainer = document.getElementById("login-container");
    const registerContainer = document.getElementById("register-container");
    const mapContainer = document.getElementById("map-container");

    // Mostrar el contenedor de inicio de sesión al cargar la página
    loginContainer.style.display = "block";
    registerContainer.style.display = "none";
    mapContainer.style.display = "none";

    // Evento para manejar el cambio de la página de inicio de sesión a registro
    document.getElementById("show-register").addEventListener("click", () => {
        loginContainer.style.display = "none";
        registerContainer.style.display = "block";
    });

    // Evento para manejar el cambio de la página de registro a inicio de sesión
    document.getElementById("show-login").addEventListener("click", () => {
        registerContainer.style.display = "none";
        loginContainer.style.display = "block";
    });

    // Evento para manejar inicio de sesión
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("login-email").value;
        const password = document.getElementById("login-password").value;

        try {
            const response = await fetch(
                "https://geolocalizacion-ten.vercel.app/api/acceso",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                }
            );

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error("Error al parsear respuesta JSON:", jsonError);
                data = { message: response.statusText };
            }

            if (!response.ok) {
                handleErrorResponse(response, data);
                return;
            }

            localStorage.setItem("token", data.token); // Guarda el token en el almacenamiento local
            mostrarMapa(); // Llama a la función para mostrar el mapa
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            alert("Error al iniciar sesión. Inténtalo de nuevo más tarde.");
        }
    });

    // Evento para manejar registro
    registerForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("register-email").value;
        const password = document.getElementById("register-password").value;

        try {
            const response = await fetch(
                "https://geolocalizacion-ten.vercel.app/api/registro",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ email, password }),
                }
            );

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error("Error al parsear respuesta JSON:", jsonError);
                data = { message: response.statusText };
            }

            if (!response.ok) {
                handleErrorResponse(response, data);
                return;
            }

            alert("Registro exitoso. Por favor, inicia sesión.");
            registerContainer.style.display = "none";
            loginContainer.style.display = "block";
        } catch (error) {
            console.error("Error al registrar:", error);
            alert("Error al registrar. Inténtalo de nuevo más tarde.");
        }
    });

    // Evento para manejar selección de grupo y obtener ubicaciones
    grupoSelect.addEventListener("change", async () => {
        const grupo = grupoSelect.value.toLowerCase(); // Convertir a minúsculas
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(
                `https://geolocalizacion-ten.vercel.app/api/ubicaciones?grupo=${grupo}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error("Error al parsear respuesta JSON:", jsonError);
                data = { message: response.statusText };
            }

            if (!response.ok) {
                handleErrorResponse(response, data);
                return;
            }

            const ubicaciones = data;
            // Lógica para mostrar ubicaciones en el mapa
            mostrarUbicacionesEnMapa(ubicaciones);
        } catch (error) {
            console.error("Error al obtener ubicaciones:", error);
            alert(
                "Error al obtener ubicaciones. Inténtalo de nuevo más tarde."
            );
        }
    });

    // Evento para manejar actualización de ubicación
    document.getElementById("update-btn").addEventListener("click", () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const latitud = position.coords.latitude;
                const longitud = position.coords.longitude;
                const token = localStorage.getItem("token");

                try {
                    const response = await fetch(
                        "https://geolocalizacion-ten.vercel.app/api/actualizar-ubicacion",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ latitud, longitud }),
                        }
                    );

                    let data;
                    try {
                        data = await response.json();
                    } catch (jsonError) {
                        console.error(
                            "Error al parsear respuesta JSON:",
                            jsonError
                        );
                        data = { message: response.statusText };
                    }

                    if (!response.ok) {
                        handleErrorResponse(response, data);
                        return;
                    }

                    // Guardar la ubicación actual del usuario en localStorage
                    const userLocation = { latitud, longitud };
                    localStorage.setItem(
                        "userLocation",
                        JSON.stringify(userLocation)
                    );

                    alert("Ubicación actualizada exitosamente.");
                    mostrarUbicacionesEnMapa([]); // mostrar el mapa con la nueva ubicación
                } catch (error) {
                    console.error("Error al actualizar ubicación:", error);
                    alert(
                        "Error al actualizar ubicación. Inténtalo de nuevo más tarde."
                    );
                }
            });
        } else {
            alert("La geolocalización no es soportada por este navegador.");
        }
    });

    // Evento para manejar agregar usuario a un grupo
    addUserForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = document.getElementById("add-user-email").value;
        const grupo = document
            .getElementById("add-user-group")
            .value.toLowerCase();
        const token = localStorage.getItem("token");

        try {
            const response = await fetch(
                "https://geolocalizacion-ten.vercel.app/api/agregar-grupo",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ email, grupo }),
                }
            );

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error("Error al parsear respuesta JSON:", jsonError);
                data = { message: response.statusText };
            }

            if (!response.ok) {
                handleErrorResponse(response, data);
                return;
            }

            alert("Usuario agregado al grupo exitosamente.");
        } catch (error) {
            console.error("Error al agregar usuario al grupo:", error);
            alert(
                "Error al agregar usuario al grupo. Inténtalo de nuevo más tarde."
            );
        }
    });

    // Función para mostrar el mapa
    function mostrarMapa() {
        loginContainer.style.display = "none";
        registerContainer.style.display = "none";
        mapContainer.style.display = "block";

        // Inicializar mapa con Leaflet
        const map = L.map("map").setView([-13.5258, -71.96267], 13); // Coordenadas iniciales y nivel de zoom

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution:
                'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);

        window.map = map; // Guardar el mapa en el objeto global `window` para acceso posterior
    }

    // Función para manejar respuestas de error
    function handleErrorResponse(response, data) {
        if (response.status === 400) {
            alert(data.message);
        } else if (response.status === 401) {
            alert(data.message);
        } else if (response.status === 500) {
            alert("Error interno del servidor. Inténtalo de nuevo más tarde.");
        } else {
            alert(`Error: ${data.message}`);
        }
    }

    // Función para leer la ubicación del usuario desde el servidor
    function leerUbicacionUsuario() {
        const token = localStorage.getItem("token");
        return fetch(
            "https://geolocalizacion-ten.vercel.app/api/leer-ubicacion",
            {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            }
        )
            .then((response) => {
                console.log("Respuesta del servidor:", response); // Log para verificar la respuesta del servidor
                return response.json();
            })
            .then((data) => {
                console.log("Datos recibidos:", data); // Log para verificar los datos recibidos
                if (data.latitud !== undefined && data.longitud !== undefined) {
                    return { latitud: data.latitud, longitud: data.longitud };
                } else {
                    console.error(
                        "Error al obtener la ubicación del servidor:",
                        data
                    );
                    return null;
                }
            })
            .catch((error) => {
                console.error("Error en la solicitud:", error);
                return null;
            });
    }

    // Función para mostrar ubicaciones en el mapa
    function mostrarUbicacionesEnMapa(ubicaciones) {
        console.log("Ubicaciones:", ubicaciones);

        // Remover los marcadores existentes del mapa (si es necesario)
        if (window.markers) {
            window.markers.forEach((marker) => marker.remove());
        }
        window.markers = [];

        // Leer la ubicación del usuario desde el servidor
        leerUbicacionUsuario().then((ubicacionUsuario) => {
            if (ubicacionUsuario) {
                const { latitud, longitud } = ubicacionUsuario;

                // Crear y mostrar el marcador de la ubicación actual del usuario
                if (
                    typeof latitud === "number" &&
                    typeof longitud === "number"
                ) {
                    // Remover marcador de ubicación anterior si existe
                    if (window.userMarker) {
                        window.userMarker.remove();
                    }

                    // Crear y mostrar el nuevo marcador de ubicación
                    window.userMarker = L.marker([latitud, longitud])
                        .addTo(map)
                        .bindPopup("Tu ubicación actual")
                        .openPopup();
                } else {
                    console.error("Latitud o longitud inválida");
                }
            }

            // Luego crear nuevos marcadores y añadirlos al mapa
            ubicaciones.forEach((ubicacion) => {
                // Verificar si location existe y tiene latitud y longitud definidas
                if (ubicacion.location) {
                    const latitud = ubicacion.location.latitud;
                    const longitud = ubicacion.location.longitud;

                    L.marker([latitud, longitud])
                        .addTo(map)
                        .bindPopup(`${ubicacion.email}`);
                } else {
                    console.warn(
                        `Ubicación inválida para ${ubicacion.email}:`,
                        ubicacion.location
                    );
                }
            });
        });
    }
});
