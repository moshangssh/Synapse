import unittest
from unittest.mock import patch, MagicMock
import sys
import os

# Add the backend directory to the path so we can import the modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from davinci_connector import _get_resolve_bmd, _connect_to_resolve, get_current_timeline

class TestDavinciConnector(unittest.TestCase):

    @patch('davinci_connector.importlib.util.spec_from_file_location')
    @patch('davinci_connector.importlib.util.module_from_spec')
    @patch('davinci_connector.os.path.exists')
    @patch('davinci_connector.sys.platform')
    def test_get_resolve_bmd_success(self, mock_platform, mock_exists, mock_module_from_spec, mock_spec_from_file_location):
        """Test successful loading of the DaVinci Resolve script module."""
        # Mock platform to be Windows
        mock_platform.startswith.return_value = True
        mock_platform.__str__.return_value = "win32"
        
        # Mock the script module path to exist
        mock_exists.return_value = True
        
        # Mock the spec and module
        mock_spec = MagicMock()
        mock_spec_from_file_location.return_value = mock_spec
        mock_module = MagicMock()
        mock_module_from_spec.return_value = mock_module
        
        # Call the function
        result = _get_resolve_bmd()
        
        # Assert that the module was loaded correctly
        self.assertEqual(result, mock_module)
        mock_spec_from_file_location.assert_called_once()
        mock_module_from_spec.assert_called_once_with(mock_spec)
        mock_spec.loader.exec_module.assert_called_once_with(mock_module)

    @patch('davinci_connector.os.path.exists')
    @patch('davinci_connector.sys.platform')
    def test_get_resolve_bmd_module_not_found(self, mock_platform, mock_exists):
        """Test when the DaVinci Resolve script module is not found."""
        # Mock platform to be Windows
        mock_platform.startswith.return_value = True
        mock_platform.__str__.return_value = "win32"
        
        # Mock the script module path to not exist
        mock_exists.return_value = False
        
        # Call the function
        result = _get_resolve_bmd()
        
        # Assert that None is returned
        self.assertIsNone(result)

    @patch('davinci_connector._get_resolve_bmd')
    def test_connect_to_resolve_success(self, mock_get_resolve_bmd):
        """Test successful connection to DaVinci Resolve."""
        # Mock the DaVinci Resolve script module
        mock_dvr_script = MagicMock()
        mock_get_resolve_bmd.return_value = mock_dvr_script
        
        # Mock the Resolve application
        mock_resolve = MagicMock()
        mock_dvr_script.scriptapp.return_value = mock_resolve
        
        # Call the function
        resolve, error = _connect_to_resolve()
        
        # Assert that the connection was successful
        self.assertEqual(resolve, mock_resolve)
        self.assertIsNone(error)
        mock_dvr_script.scriptapp.assert_called_once_with("Resolve")

    @patch('davinci_connector._get_resolve_bmd')
    def test_connect_to_resolve_failure(self, mock_get_resolve_bmd):
        """Test failure to connect to DaVinci Resolve."""
        # Mock the DaVinci Resolve script module
        mock_dvr_script = MagicMock()
        mock_get_resolve_bmd.return_value = mock_dvr_script
        
        # Mock the Resolve application to return None
        mock_dvr_script.scriptapp.return_value = None
        
        # Call the function
        resolve, error = _connect_to_resolve()
        
        # Assert that the connection failed
        self.assertIsNone(resolve)
        self.assertIsNotNone(error)
        self.assertEqual(error["code"], "resolve_not_running")
        mock_dvr_script.scriptapp.assert_called_once_with("Resolve")

    @patch('davinci_connector._connect_to_resolve')
    def test_get_current_timeline_success(self, mock_connect_to_resolve):
        """Test successful retrieval of the current timeline."""
        # Mock the Resolve connection
        mock_resolve = MagicMock()
        mock_connect_to_resolve.return_value = (mock_resolve, None)
        
        # Mock the project manager, project, and timeline
        mock_project_manager = MagicMock()
        mock_project = MagicMock()
        mock_timeline = MagicMock()
        mock_resolve.GetProjectManager.return_value = mock_project_manager
        mock_project_manager.GetCurrentProject.return_value = mock_project
        mock_project.GetCurrentTimeline.return_value = mock_timeline
        
        # Mock the frame rate
        mock_timeline.GetSetting.return_value = "24.0"
        
        # Call the function
        resolve, project, timeline, frame_rate, error = get_current_timeline()
        
        # Assert that the timeline and frame rate were retrieved correctly
        self.assertEqual(timeline, mock_timeline)
        self.assertEqual(frame_rate, 24.0)
        self.assertIsNone(error)

    @patch('davinci_connector._connect_to_resolve')
    def test_get_current_timeline_no_project(self, mock_connect_to_resolve):
        """Test when no project is open."""
        # Mock the Resolve connection
        mock_resolve = MagicMock()
        mock_connect_to_resolve.return_value = (mock_resolve, None)
        
        # Mock the project manager to return None for the current project
        mock_project_manager = MagicMock()
        mock_resolve.GetProjectManager.return_value = mock_project_manager
        mock_project_manager.GetCurrentProject.return_value = None
        
        # Call the function
        resolve, project, timeline, frame_rate, error = get_current_timeline()
        
        # Assert that the error is correct
        self.assertIsNone(timeline)
        self.assertIsNone(frame_rate)
        self.assertIsNotNone(error)
        self.assertEqual(error["code"], "no_project_open")

    @patch('davinci_connector._connect_to_resolve')
    def test_get_current_timeline_no_timeline(self, mock_connect_to_resolve):
        """Test when no timeline is active."""
        # Mock the Resolve connection
        mock_resolve = MagicMock()
        mock_connect_to_resolve.return_value = (mock_resolve, None)
        
        # Mock the project manager and project
        mock_project_manager = MagicMock()
        mock_project = MagicMock()
        mock_resolve.GetProjectManager.return_value = mock_project_manager
        mock_project_manager.GetCurrentProject.return_value = mock_project
        
        # Mock the project to return None for the current timeline
        mock_project.GetCurrentTimeline.return_value = None
        
        # Call the function
        resolve, project, timeline, frame_rate, error = get_current_timeline()
        
        # Assert that the error is correct
        self.assertIsNone(timeline)
        self.assertIsNone(frame_rate)
        self.assertIsNotNone(error)
        self.assertEqual(error["code"], "no_active_timeline")

if __name__ == '__main__':
    unittest.main()