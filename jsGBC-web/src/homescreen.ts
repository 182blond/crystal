export type PromptEvent = Event & { prompt(): void, userChoice: Promise<any> };

export class Homescreen {
  promptEvent: PromptEvent;

  async bind() {
    // Service worker only exists in the GitHub Pages build (docs/), not in local dev.
    if (
      "serviceWorker" in navigator &&
      window.location.pathname.includes("/jsGBC-web")
    ) {
      try {
        await navigator.serviceWorker.register("/jsGBC-web/service-worker.js", {
          scope: "/jsGBC-web/"
        });
      } catch (err) {
        console.warn("Service worker not registered:", err);
      }
    }

    return new Promise(resolve => {
      window.addEventListener("beforeinstallprompt", (e: PromptEvent) => {
        e.preventDefault();
        this.promptEvent = e;
        resolve();
      });
    });
  }

  async prompt() {
    this.promptEvent.prompt();
    return await this.promptEvent.userChoice;
  }
}

export default new Homescreen();