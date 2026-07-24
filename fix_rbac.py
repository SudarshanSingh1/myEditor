import os
import re
import glob

files = glob.glob('backend/app/api/v1/*.py')

for file_path in files:
    with open(file_path, 'r') as f:
        lines = f.readlines()
        
    new_lines = []
    i = 0
    changed = False
    while i < len(lines):
        line = lines[i]
        
        # Check if this line is a @require_permission
        match_perm = re.match(r'^\s*@require_permission\("([^"]+)"\)\s*$', line)
        if match_perm:
            perm = match_perm.group(1)
            # Find the previous @router line
            if len(new_lines) > 0 and '@router.' in new_lines[-1]:
                prev_line = new_lines[-1]
                # Inject dependencies=[Depends(require_permission("..."))]
                if prev_line.strip().endswith(')'):
                    if prev_line.strip() == '@router.get("/")' or prev_line.strip().endswith('("/")') or prev_line.strip().endswith('"/")'):
                        # If it's a simple route with no other kwargs
                        pass
                    if 'dependencies=[' in prev_line:
                        # Append to existing dependencies
                        prev_line = prev_line.replace('dependencies=[', f'dependencies=[Depends(require_permission("{perm}")), ')
                    else:
                        # Add dependencies kwarg
                        prev_line = prev_line.replace(')', f', dependencies=[Depends(require_permission("{perm}"))])')
                else:
                    # e.g. @router.get("/")
                    if prev_line.endswith(')\n'):
                        prev_line = prev_line[:-2] + f', dependencies=[Depends(require_permission("{perm}"))])\n'
                new_lines[-1] = prev_line
                changed = True
            else:
                # If there's no router line, just keep it (maybe an error)
                new_lines.append(line)
        else:
            new_lines.append(line)
        i += 1
        
    if changed:
        with open(file_path, 'w') as f:
            f.writelines(new_lines)
