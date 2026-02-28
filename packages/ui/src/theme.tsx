import { createTheme, ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import styleConstants from './constants/style-constants';

const theme = createTheme({
  typography: {
    fontFamily: styleConstants.secondaryFont,
  },
});

export { theme, ThemeProvider, CssBaseline };
