import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import History from './pages/History';
import EditReminders from './pages/EditReminders';
import DoctorsReport from './pages/DoctorsReport';
import ReportViewer from './pages/ReportViewer';
import __Layout from './Layout.jsx';

export const PAGES = {
    "Dashboard": Dashboard,
    "Upload": Upload,
    "History": History,
    "EditReminders": EditReminders,
    "DoctorsReport": DoctorsReport,
    "ReportViewer": ReportViewer,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};