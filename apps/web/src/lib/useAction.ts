import { useQueryClient } from "@tanstack/react-query";
import { useLibrary } from "@/lib/useLibrary";
import { useMutationSafe } from "@/lib/useMutationSafe";
    const { libraries, selectedLibrary, setLibraries, selectLibraryById } = useLibrary();
    const queryClient = useQueryClient();
    const removeLibrary = useMutationSafe({
        mutationFn: (opts: { libraryId: string }) => window.chroma!.library.remove(opts),
        onSuccess: (_, data) => setLibraries(libraries.filter(lib => lib.id !== data.libraryId)),
    });
    });
        createLibrary: (name: string, icon: string, color: string, path: string, onSuccess?: () => void) => {
            if (!window.chroma) return;

            pushNoti({
                title: "Creating library",
                description: 'Library "' + name + '" is being created...',
                type: "promise",
                promise: window.chroma.library.create({ name, icon, color, path }),
                peek: "Creating library",
                success: d => ({
                    title: "Library created",
                    description: 'The library "' + d.name + '" was created successfully!',
                }),
                error: _ => ({
                    title: "Error creating library",
                    description: "An error occurred while creating the library",
                }),
                onSuccess: async d => {
                    await selectLibraryById(d.id);
                    onSuccess?.();
                },
            });
        },
        removeLibrary: async (libraryId: string) => {
            await removeLibrary.mutateAsync({ libraryId });

            const idx = libraries.findIndex(lib => lib.id === libraryId);
            const rest = libraries.filter(lib => lib.id !== libraryId);

            setLibraries(rest);
            await selectLibraryById(rest.length >= idx + 1 ? rest[idx].id : rest.length > 0 ? rest[idx - 1].id : null);
        },
            if (!selectedLibrary) return;
            return removeLibrary.mutateAsync({ libraryId: selectedLibrary.id });
        },
