// Register the service worker
export async function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    try {
      console.log("Registering service worker...");

      // Register the service worker with the specific scope
      const registration = await navigator.serviceWorker.register(
        "/service-worker.js",
        {
          scope: "/",
        }
      );

      console.log("Service worker registration successful:", registration);

      // Wait for the service worker to be active
      if (registration.installing) {
        console.log("Service worker installing");

        return new Promise((resolve) => {
          registration.installing.addEventListener("statechange", function () {
            if (this.state === "activated") {
              console.log("Service worker activated");
              resolve(registration);
            }
          });
        });
      } else if (registration.waiting) {
        console.log("Service worker waiting");
        return registration;
      } else if (registration.active) {
        console.log("Service worker already active");
        return registration;
      }

      return registration;
    } catch (error) {
      console.error("Service worker registration failed:", error);
      throw error;
    }
  } else {
    console.warn("Service workers are not supported in this browser");
    throw new Error("Service workers not supported");
  }
}

// Unregister all service workers
export async function unregisterServiceWorkers() {
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
        console.log("Service worker unregistered");
      }
      return true;
    } catch (error) {
      console.error("Service worker unregistration failed:", error);
      return false;
    }
  }
  return false;
}
