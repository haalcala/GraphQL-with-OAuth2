import { Entity, ObjectIdColumn, ObjectID, Column, BaseEntity } from "typeorm";

@Entity("AccessTokens")
export class AccessToken extends BaseEntity {
	@ObjectIdColumn()
	id: ObjectID;

	@Column("text")
	userId: string;

	@Column("text")
	token: string;

	@Column("text")
	grant_type: string;

	@Column()
	createdAt: Date;

	@Column()
	updatedAt: Date;
}
