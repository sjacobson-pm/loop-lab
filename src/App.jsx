import { Route, Routes } from 'react-router';

import { AppLayout } from 'features/ui/app-layout/AppLayout';
import { PageNotFound } from 'pages/page-not-found/PageNotFound';
import { SampleHome } from 'pages/sample-home/SampleHome';

function App() {
  return (
    <Routes>
      <Route path="*" element={<AppLayout />}>
        <Route path="" element={<SampleHome />} />
        {/*
            add additional routes here (before the page-not-found route)
            // * example route: <Route path="user-settings" element={<UserSettings />} />
            // * example conditional route: {renderWidgetsRoute ? <Route path="widgets" element={<Widgets />} /> : null}
           */}
        <Route path="*" element={<PageNotFound />} />
      </Route>
    </Routes>
  );
}

export { App };
