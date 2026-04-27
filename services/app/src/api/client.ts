import ky from "ky";

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL,
  timeout: 10000,
  hooks: {
    beforeRequest: [
      async (request) => {
        // Import dynamique du store seulement quand on en a besoin
        // Cela évite de planter le bundle JS si le store a un souci au démarrage.
        const { useAuthStore } = await import("@/features/auth/stores/auth.store");
        const token = useAuthStore.getState().accessToken;
        
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      }
    ]
  }
})
