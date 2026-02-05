import re
import os

def fix_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replacements for arrow functions (arg) =>
    # Avoid matching if (arg)
    # Arrow functions usually have => after.
    # regex: \(([\w{}\s,]+)\)\s*=>
    
    def repl_arrow(match):
        args = match.group(1)
        # simplistic check: if args contain : then skip
        if ':' in args: return match.group(0)
        # add : any to each arg
        # split by comma
        parts = args.split(',')
        new_parts = []
        for p in parts:
            p = p.strip()
            if not p: continue
            if re.match(r'^\w+$', p): # simple var
                new_parts.append(f"{p}: any")
            elif p.startswith('{') and p.endswith('}'): # destructuring
                new_parts.append(f"{p}: any")
            else:
                 new_parts.append(p) # keep as is if complex
        
        return f"({', '.join(new_parts)}) =>"

    content = re.sub(r'\(([^)]+)\)\s*=>', repl_arrow, content)

    # Replacements for method(arg) {
    # Skip if|for|while|switch|catch
    # regex: (\w+)\s*\(([^)]+)\)\s*\{
    
    def repl_method(match):
        name = match.group(1)
        if name in ['if', 'for', 'while', 'switch', 'catch']:
            return match.group(0)
        
        args = match.group(2)
        if ':' in args: return match.group(0)
        
        parts = args.split(',')
        new_parts = []
        for p in parts:
            p = p.strip()
            if not p: continue
            if re.match(r'^\w+$', p): 
                new_parts.append(f"{p}: any")
            elif p.startswith('{') and p.endswith('}'):
                new_parts.append(f"{p}: any")
            else:
                 new_parts.append(p)
                 
        return f"{name}({', '.join(new_parts)}) {{"

    content = re.sub(r'(\w+)\s*\(([^)]+)\)\s*\{', repl_method, content)
    
    # Catch async methods: async foo(arg) {
    def repl_async(match):
        name = match.group(1)
        args = match.group(2)
         # Same logic
        if ':' in args: return match.group(0)
        parts = args.split(',')
        new_parts = []
        for p in parts:
            p = p.strip()
            if not p: continue
            if re.match(r'^\w+$', p): 
                new_parts.append(f"{p}: any")
            elif p.startswith('{') and p.endswith('}'):
                new_parts.append(f"{p}: any")
            else:
                 new_parts.append(p)
        return f"async {name}({', '.join(new_parts)}) {{"

    content = re.sub(r'async\s+(\w+)\s*\(([^)]+)\)\s*\{', repl_async, content)

    # Catch const foo = async (arg) =>
    # handled by arrow regex

    with open(filepath, 'w') as f:
        f.write(content)

for root, dirs, files in os.walk("src"):
    for file in files:
        if file.endswith(".ts") and (root.startswith("src/routes") or root.startswith("src/data")):
            fix_file(os.path.join(root, file))
