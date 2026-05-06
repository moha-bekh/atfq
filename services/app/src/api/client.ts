import ky from "ky";

export const api = ky.create({
  prefixUrl: import.meta.env.VITE_API_URL,
  timeout: 10000,
  hooks: {
    beforeRequest: [
      async (request) => {
        // Import dynamique du store seulement quand on en a besoin
        const { useAppStore } = await import("@/stores/app.store");
        const token = useAppStore.getState().accessToken;
        
        if (token) {
          request.headers.set("Authorization", `Bearer ${token}`);
        }
      }
    ]
  }
})
