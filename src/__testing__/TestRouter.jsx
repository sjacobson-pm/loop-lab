import { MemoryRouter } from 'react-router';

/**
 * TestRouter component to wrap children with MemoryRouter for testing.
 * @param {Object} props - The component props.
 * @param {React.ReactNode} props.children - The child components to be wrapped.
 * @param {string[]} props.initialEntries - The initial entries for the MemoryRouter.
 * @returns {JSX.Element} The wrapped children within MemoryRouter.
 *
 * @example
 * <TestRouter initialEntries={['/test-path']}>
 *   <MyComponent />
 * </TestRouter>
 */
const TestRouter = ({ children, initialEntries }) => {
  return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
};

export { TestRouter };
