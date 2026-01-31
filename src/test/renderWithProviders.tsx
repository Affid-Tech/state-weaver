import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { PropsWithChildren, ReactElement } from "react";
import { BrowserRouter } from "react-router-dom";

type RenderWithProvidersOptions = {
  route?: string;
};

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

export const renderWithProviders = (
  ui: ReactElement,
  { route = "/" }: RenderWithProvidersOptions = {},
) => {
  window.history.pushState({}, "Test page", route);
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>{children}</BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};
