import { fireEvent } from "@testing-library/react";

type UserEventInstance = {
  click: (element: Element) => Promise<void>;
  type: (element: Element, text: string) => Promise<void>;
  keyboard: (text: string) => Promise<void>;
};

const userEvent = {
  setup: (): UserEventInstance => ({
    click: async (element) => {
      fireEvent.click(element);
    },
    type: async (element, text) => {
      fireEvent.change(element, { target: { value: text } });
    },
    keyboard: async (text) => {
      for (const key of text) {
        fireEvent.keyDown(document.body, { key });
        fireEvent.keyUp(document.body, { key });
      }
    },
  }),
};

export default userEvent;
