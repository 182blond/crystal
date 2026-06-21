import keyboardMapping from "./keyboard-mapping";
import { normalizeAction } from "./action-names";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!target || !(target as HTMLElement).tagName) return false;
  const tag = (target as HTMLElement).tagName.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

export class KeyboardButtons {
  bind(gameboy) {
    window.addEventListener("keydown", e => {
      if (isTypingTarget(e.target)) return;

      const action = normalizeAction(keyboardMapping[e.keyCode]);
      if (!action || !gameboy.actions.is(action)) return;

      gameboy.actionDown(action);
      e.preventDefault();
    });

    window.addEventListener("keyup", e => {
      if (isTypingTarget(e.target)) return;

      const action = normalizeAction(keyboardMapping[e.keyCode]);
      if (!action || !gameboy.actions.is(action)) return;

      gameboy.actionUp(action);
      e.preventDefault();
    });
  }
}

export default new KeyboardButtons();
