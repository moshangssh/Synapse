import unittest
from unittest.mock import patch, MagicMock
import sys
import os

from backend.davinci_connector import _get_resolve_bmd, _connect_to_resolve, get_current_timeline
from backend.exceptions import ResolveConnectionError, NoProjectOpenError, NoActiveTimelineError

class TestDavinciConnector(unittest.TestCase):

    @patch('backend.davinci_connector.importlib.util.spec_from_file_location')
    @patch('backend.davinci_connector.importlib.util.module_from_spec')
    @patch('backend.davinci_connector.os.path.exists')
    @patch('backend.davinci_connector.sys.platform')
    def test_get_resolve_bmd_success(self, mock_platform, mock_exists, mock_module_from_spec, mock_spec_from_file_location):
        """Test successful loading of the DaVinci Resolve script module."""
        mock_platform.startswith.return_value = True
        mock_platform.__str__.return_value = "win32"
        mock_exists.return_value = True
        mock_spec = MagicMock()
        mock_spec_from_file_location.return_value = mock_spec
        mock_module = MagicMock()
        mock_module_from_spec.return_value = mock_module
        
        result = _get_resolve_bmd()
        
        self.assertEqual(result, mock_module)
        mock_spec_from_file_location.assert_called_once()
        mock_module_from_spec.assert_called_once_with(mock_spec)
        mock_spec.loader.exec_module.assert_called_once_with(mock_module)

    @patch('backend.davinci_connector.os.path.exists')
    @patch('backend.davinci_connector.sys.platform')
    def test_get_resolve_bmd_module_not_found(self, mock_platform, mock_exists):
        """Test when the DaVinci Resolve script module is not found."""
        mock_platform.startswith.return_value = True
        mock_platform.__str__.return_value = "win32"
        mock_exists.return_value = False
        
        result = _get_resolve_bmd()
        
        self.assertIsNone(result)

    @patch('backend.davinci_connector._get_resolve_bmd')
    @patch('backend.davinci_connector.importlib.import_module')
    def test_connect_to_resolve_success(self, mock_import_module, mock_get_resolve_bmd):
        """Test successful connection to DaVinci Resolve."""
        mock_dvr_script = MagicMock()
        mock_get_resolve_bmd.return_value = mock_dvr_script
        mock_fusionscript = MagicMock()
        mock_import_module.return_value = mock_fusionscript
        mock_resolve = MagicMock()
        mock_fusionscript.scriptapp.return_value = mock_resolve
        
        resolve = _connect_to_resolve()
        
        self.assertEqual(resolve, mock_resolve)
        mock_fusionscript.scriptapp.assert_called_once_with("Resolve")

    @patch('backend.davinci_connector._get_resolve_bmd')
    @patch('backend.davinci_connector.importlib.import_module')
    def test_connect_to_resolve_failure(self, mock_import_module, mock_get_resolve_bmd):
        """Test failure to connect to DaVinci Resolve."""
        mock_dvr_script = MagicMock()
        mock_get_resolve_bmd.return_value = mock_dvr_script
        mock_fusionscript = MagicMock()
        mock_import_module.return_value = mock_fusionscript
        mock_fusionscript.scriptapp.return_value = None
        
        with self.assertRaises(ResolveConnectionError):
            _connect_to_resolve()

    @patch('backend.davinci_connector._connect_to_resolve')
    def test_get_current_timeline_success(self, mock_connect_to_resolve):
        """Test successful retrieval of the current timeline."""
        mock_resolve = MagicMock()
        mock_connect_to_resolve.return_value = mock_resolve
        mock_project_manager = MagicMock()
        mock_project = MagicMock()
        mock_timeline = MagicMock()
        mock_resolve.GetProjectManager.return_value = mock_project_manager
        mock_project_manager.GetCurrentProject.return_value = mock_project
        mock_project.GetCurrentTimeline.return_value = mock_timeline
        mock_timeline.GetSetting.return_value = "24.0"
        
        resolve, project, timeline, frame_rate = get_current_timeline()
        
        self.assertEqual(timeline, mock_timeline)
        self.assertEqual(frame_rate, 24.0)

    @patch('backend.davinci_connector._connect_to_resolve')
    def test_get_current_timeline_no_project(self, mock_connect_to_resolve):
        """Test when no project is open."""
        mock_resolve = MagicMock()
        mock_connect_to_resolve.return_value = mock_resolve
        mock_project_manager = MagicMock()
        mock_resolve.GetProjectManager.return_value = mock_project_manager
        mock_project_manager.GetCurrentProject.return_value = None
        
        with self.assertRaises(NoProjectOpenError):
            get_current_timeline()

    @patch('backend.davinci_connector._connect_to_resolve')
    def test_get_current_timeline_no_timeline(self, mock_connect_to_resolve):
        """Test when no timeline is active."""
        mock_resolve = MagicMock()
        mock_connect_to_resolve.return_value = mock_resolve
        mock_project_manager = MagicMock()
        mock_project = MagicMock()
        mock_resolve.GetProjectManager.return_value = mock_project_manager
        mock_project_manager.GetCurrentProject.return_value = mock_project
        mock_project.GetCurrentTimeline.return_value = None
        
        with self.assertRaises(NoActiveTimelineError):
            get_current_timeline()

if __name__ == '__main__':
    unittest.main()