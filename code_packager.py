import os
import xml.etree.ElementTree as ET
from xml.dom import minidom
import base64
import mimetypes
import argparse
from datetime import datetime

def is_text_file(filepath):
    """判断文件是否为文本文件"""
    text_extensions = {
        '.py', '.js', '.ts', '.tsx', '.jsx', '.html', '.css', '.scss', '.json', 
        '.xml', '.md', '.txt', '.yml', '.yaml', '.toml', '.ini', '.cfg', 
        '.conf', '.sh', '.bat', '.cmd', '.ps1', '.sql', '.log', '.csv', 
        '.tsv', '.env', '.gitignore', '.dockerignore', '.editorconfig',
        '.rs', '.lock', '.test.ts', '.test.tsx', '.test.js', '.test.jsx'
    }
    
    _, ext = os.path.splitext(filepath)
    return ext.lower() in text_extensions

def read_file_content(filepath):
    """读取文件内容，如果是文本文件则直接读取，如果是二进制文件则进行base64编码"""
    try:
        if is_text_file(filepath):
            # 尝试UTF-8编码，如果失败则尝试其他编码
            try:
                with open(filepath, 'r', encoding='utf-8') as file:
                    return file.read(), 'text'
            except UnicodeDecodeError:
                try:
                    with open(filepath, 'r', encoding='gbk') as file:
                        return file.read(), 'text'
                except UnicodeDecodeError:
                    with open(filepath, 'r', encoding='latin-1') as file:
                        return file.read(), 'text'
        else:
            # 二进制文件进行base64编码
            with open(filepath, 'rb') as file:
                return base64.b64encode(file.read()).decode('utf-8'), 'binary'
    except Exception as e:
        return f"Error reading file: {str(e)}", 'error'

def get_file_info(filepath, root_dir):
    """获取文件信息"""
    relative_path = os.path.relpath(filepath, root_dir)
    file_size = os.path.getsize(filepath)
    modified_time = datetime.fromtimestamp(os.path.getmtime(filepath)).isoformat()
    
    # 获取MIME类型
    mime_type, _ = mimetypes.guess_type(filepath)
    if mime_type is None:
        mime_type = 'application/octet-stream'
    
    return {
        'path': relative_path,
        'size': file_size,
        'modified_time': modified_time,
        'mime_type': mime_type
    }

def should_exclude_directory(dirname):
    """判断目录是否应该被排除"""
    exclude_dirs = {
        # Python相关
        '__pycache__', '.pytest_cache', '.mypy_cache', 'venv', 'env', '.venv',
        # Node.js相关
        'node_modules', '.npm', '.nvm',
        # Git相关
        '.git', '.github',
        # IDE相关
        '.vscode', '.idea', '.vs', '.vscode-insiders',
        # 构建产物
        'dist', 'build', 'out', 'target', 'bin', 'obj',
        # 缓存
        '.cache', '.temp', '.tmp', 'temp', 'tmp',
        # 覆盖率报告
        'htmlcov', '.coverage', 'coverage',
        # 文档生成
        'docs', '_build', 'site',
        # Tauri相关
        'src-tauri/target',
        # 其他
        '.DS_Store', '.local', '.config'
    }
    return dirname in exclude_dirs or dirname.startswith('.')

def should_exclude_file(filename):
    """判断文件是否应该被排除"""
    exclude_files = {
        # 系统文件
        'Thumbs.db', 'desktop.ini', '.DS_Store',
        # Python相关
        '*.pyc', '*.pyo', '*.pyd',
        # Node.js相关
        '*.log', '*.pid', '*.seed', '*.pid.lock',
        # 构建产物
        '*.min.js', '*.min.css', '*.bundle.js', '*.chunk.js',
        # 测试覆盖率
        '.coverage', 'coverage.xml', 'coverage.json',
        # 锁文件
        'package-lock.json', 'yarn.lock', 'Cargo.lock',
        # 其他
        '.env', '.env.local', '.env.development.local', '.env.test.local', '.env.production.local'
    }
    
    # 检查文件名是否在排除列表中
    if filename in exclude_files:
        return True
    
    # 检查文件扩展名是否在排除列表中
    name, ext = os.path.splitext(filename)
    ext = ext.lower()
    if ext in {'.pyc', '.pyo', '.pyd', '.log', '.pid', '.seed', '.lock', '.svg'}:
        return True
    
    # 检查是否为隐藏文件（以点开头的文件）
    if filename.startswith('.'):
        return True
    
    return False

def traverse_directory(directory):
    """遍历目录，收集所有文件信息"""
    files = []
    for root, dirs, filenames in os.walk(directory):
        # 排除一些不需要的目录
        dirs[:] = [d for d in dirs if not should_exclude_directory(d)]
        
        for filename in filenames:
            if not should_exclude_file(filename):
                filepath = os.path.join(root, filename)
                file_info = get_file_info(filepath, directory)
                content, content_type = read_file_content(filepath)
                file_info['content'] = content
                file_info['content_type'] = content_type
                files.append(file_info)
    
    return files

def create_xml_element(files, directory_name):
    """创建XML元素"""
    root = ET.Element("code_package")
    root.set("directory", directory_name)
    root.set("generated_at", datetime.now().isoformat())
    
    for file_info in files:
        file_elem = ET.SubElement(root, "file")
        file_elem.set("path", file_info['path'])
        file_elem.set("size", str(file_info['size']))
        file_elem.set("modified_time", file_info['modified_time'])
        file_elem.set("mime_type", file_info['mime_type'])
        file_elem.set("content_type", file_info['content_type'])
        
        content_elem = ET.SubElement(file_elem, "content")
        content_elem.text = file_info['content']
    
    return root

def prettify_xml(elem):
    """美化XML输出"""
    rough_string = ET.tostring(elem, 'utf-8')
    reparsed = minidom.parseString(rough_string)
    return reparsed.toprettyxml(indent="  ")

def save_xml_file(xml_element, output_path):
    """保存XML文件"""
    xml_str = prettify_xml(xml_element)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(xml_str)

def main():
    parser = argparse.ArgumentParser(description='将前后端代码分别打包成XML文件')
    parser.add_argument('--backend-dir', default='backend', help='后端代码目录路径')
    parser.add_argument('--frontend-dir', default='frontend/synapse', help='前端代码目录路径')
    parser.add_argument('--output-dir', default='.', help='输出目录路径')
    
    args = parser.parse_args()
    
    # 确保输出目录存在
    os.makedirs(args.output_dir, exist_ok=True)
    
    print(f"开始打包后端代码，目录: {args.backend_dir}")
    backend_files = traverse_directory(args.backend_dir)
    backend_xml = create_xml_element(backend_files, args.backend_dir)
    backend_output_path = os.path.join(args.output_dir, 'backend_code.xml')
    save_xml_file(backend_xml, backend_output_path)
    print(f"后端代码已打包到: {backend_output_path}")
    
    print(f"开始打包前端代码，目录: {args.frontend_dir}")
    frontend_files = traverse_directory(args.frontend_dir)
    frontend_xml = create_xml_element(frontend_files, args.frontend_dir)
    frontend_output_path = os.path.join(args.output_dir, 'frontend_code.xml')
    save_xml_file(frontend_xml, frontend_output_path)
    print(f"前端代码已打包到: {frontend_output_path}")
    
    print("打包完成!")

if __name__ == "__main__":
    main()