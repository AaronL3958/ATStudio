import GalleryView from '../gallery-view';
import {getAppUser} from '../account-auth';
export const dynamic='force-dynamic';
export const metadata={title:'Community gallery — ATStudio'};
export default async function Page(){const user=await getAppUser();return <GalleryView initialUser={user?{name:user.name,email:user.email,kind:user.kind}:null}/>}
